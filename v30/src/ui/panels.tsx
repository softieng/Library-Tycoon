import { useRef, useState, type ReactNode } from 'react';
import { BALANCE } from '../config/balance';
import { ACHIEVEMENTS, EVENT_BY_ID, type EventOption } from '../config/events';
import { HALL_ROADMAP, hallExpansionCost, hallProgress } from '../config/hallRoadmap';
import { FLAGS } from '../config/featureFlags';
import { QUEUES, SEATS, SHELVES, ZONES, zoneAt } from '../config/layout';
import { ROLES, SERVICES, type ServiceId } from '../config/services';
import { UPGRADES } from '../config/upgrades';
import { MISSION_BY_ID } from '../missions/definitions';
import { missionViews, type MissionView } from '../missions/engine';
import { efficiencyOf, salaryOf, trainCostOf } from '../staff/staff';
import { Bar, Btn, Pill, Section, Stat } from './widgets';
import { dec1, iqd, mmss, num, pct, useGame } from './hooks';

export type PanelId = 'home' | 'library' | 'staff' | 'visitors' | 'missions' | 'build' | 'services' | 'events' | 'achievements' | 'finance' | 'settings';
export const PANELS: { id: PanelId; icon: string; title: string }[] = [
  { id: 'home', icon: '🏛️', title: 'الرئيسية' },
  { id: 'missions', icon: '🎯', title: 'المهمات' },
  { id: 'build', icon: '🏗️', title: 'البناء والترقيات' },
  { id: 'staff', icon: '👥', title: 'الموظفون' },
  { id: 'services', icon: '🛎️', title: 'الخدمات' },
  { id: 'visitors', icon: '🎓', title: 'الطلبة والزوار' },
  { id: 'library', icon: '🗺️', title: 'نظرة على المكتبة' },
  { id: 'events', icon: '📣', title: 'الأحداث' },
  { id: 'achievements', icon: '🏆', title: 'الإنجازات' },
  { id: 'finance', icon: '📊', title: 'المالية والتقارير' },
  { id: 'settings', icon: '⚙️', title: 'الإعدادات والحفظ' },
];

const NEED_AR: Record<string, string> = { borrow: 'استعارة', read: 'مطالعة', computer: 'حاسبة', research: 'بحث علمي', print: 'طباعة' };
const STATE_AR: Record<string, string> = { enter: 'يدخل', toShelf: 'متجه للرفوف', browse: 'يتصفح الرفوف', toQueue: 'متجه للطابور', queue: 'في الطابور', served: 'يُخدَم الآن', toSeat: 'متجه لمقعد', sit: 'جالس', leave: 'يغادر', lost: 'يحتاج مساعدة', follow: 'يتبع الحارس الصغير' };
const STAFF_STATE_AR: Record<string, string> = { working: 'في موقع العمل', serving: 'يخدم طالباً', break: 'استراحة قصيرة', walking: 'متجه لبقعة', cleaning: 'ينظّف' };

/* ------------------------------------------------------------------ Home */
function Home({ go }: { go: (p: PanelId) => void }) {
  const c = useGame(), s = c.state, l = s.ledger;
  const next = UPGRADES.find((u) => !s.upgrades.includes(u.id) && !(u.flag && !FLAGS[u.flag]) && !u.requires?.some((r) => !s.upgrades.includes(r)));
  const queue = s.queues.borrow.length + s.queues.print.length + s.queues.research.length;
  const tips: string[] = [];
  if (queue >= 5) tips.push('الطوابير طويلة: درّب الموظفين أو اشترِ «منطقة انتظار منظمة».');
  if (s.cleanliness < 75) tips.push('النظافة منخفضة: عيّن عامل نظافة أو انقر على البقع للتنظيف العاجل.');
  if (l.lost > 2) tips.push('طلبة يغادرون منزعجين: زِد المقاعد والحاسبات عبر الترقيات.');
  if (s.broken.length) tips.push('يوجد جهاز عاطل: انقر عليه في القاعة لإصلاحه.');
  if (!tips.length) tips.push('المكتبة تعمل بسلاسة. جرّب مهمة جديدة أو وفّر للترقية التالية.');
  return (
    <>
      <div className="grid2">
        <Stat icon="💰" label="إيراد اليوم" value={iqd(l.income)} tone="good" />
        <Stat icon="🧾" label="مصروف اليوم" value={iqd(l.expenses)} tone="bad" />
        <Stat icon="✔️" label="خدمات منجزة اليوم" value={num(l.served)} />
        <Stat icon="👥" label="زوار اليوم" value={num(l.arrivals)} />
        <Stat icon="⏳" label="في الطوابير الآن" value={num(queue)} />
        <Stat icon="🚪" label="غادروا منزعجين" value={num(l.lost)} tone={l.lost ? 'bad' : undefined} />
      </div>
      <Section title="مؤشرات الأداء">
        <Bar label="رضا الزوار" value={s.satisfaction} />
        <Bar label="النظافة" value={s.cleanliness} />
        <Bar label="السمعة" value={(s.reputation / 5) * 100} text={`${dec1(s.reputation)} / ٥`} />
      </Section>
      <Section title="نصيحة المدير">{tips.map((t) => <p className="tip" key={t}>💡 {t}</p>)}</Section>
      {next && (
        <Section title="الترقية التالية">
          <div className="row"><div><b>{next.nameAr}</b><small>{next.effectAr}</small></div>
            <Btn onClick={() => go('build')} kind={s.money >= next.cost ? 'gold' : 'ghost'}>{iqd(next.cost)}</Btn></div>
          <Bar value={Math.min(100, (s.money / next.cost) * 100)} />
        </Section>
      )}
      <Section title="آخر الأحداث">
        <ul className="log">{s.log.slice(0, 8).map((e, i) => <li key={i} className={`log--${e.tone}`}>{e.text}</li>)}{!s.log.length && <li>بدأ يوم جديد في المكتبة المركزية.</li>}</ul>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Missions */
function MissionCard({ v }: { v: MissionView }) {
  const c = useGame(), s = c.state, d = v.def, run = s.missions.active?.id === d.id ? s.missions.active : null;
  return (
    <div className={`card mission mission--${v.status}`} data-mission={d.id}>
      <div className="row">
        <div><b>{d.icon} {d.titleAr}</b><small>{ZONES.find((z) => z.id === d.location)?.nameAr}</small></div>
        <Pill tone={v.status === 'completed' ? 'good' : v.status === 'active' ? 'gold' : v.status === 'available' ? 'info' : 'muted'}>
          {v.status === 'completed' ? 'مكتملة' : v.status === 'active' ? 'جارية' : v.status === 'available' ? 'متاحة' : v.status === 'cooldown' ? `بعد ${mmss(v.cooldownLeft!)}` : 'مقفلة'}
        </Pill>
      </div>
      <p>{d.descriptionAr}</p>
      {run ? (
        <>
          {d.objectives.map((o) => {
            const cur = o.kind === 'count' ? run.progress[o.id] : s[o.stat], max = o.kind === 'count' ? o.count : o.gte;
            return <Bar key={o.id} label={o.textAr} value={Math.min(100, (cur / max) * 100)} text={o.kind === 'count' ? `${num(cur)} / ${num(max)}` : pct(cur)} />;
          })}
          <p className="how">🧭 {d.howAr}</p>
          <div className="row">{run.timeLeft !== null && <Pill tone="gold">⏱ {mmss(run.timeLeft)}</Pill>}<Btn kind="ghost" onClick={() => c.dispatch({ type: 'abandonMission' })}>إلغاء المهمة</Btn></div>
        </>
      ) : (
        <div className="row">
          <small>المكافأة: <b>{iqd(d.reward.money)}</b>{d.timeLimit ? ` · الوقت ${mmss(d.timeLimit)}` : ''}{v.timesCompleted && d.category === 'repeatable' ? ` · أُنجزت ${num(v.timesCompleted)} مرة` : ''}</small>
          {v.status === 'available' && <Btn kind="gold" disabled={!!s.missions.active} onClick={() => c.dispatch({ type: 'startMission', id: d.id })} data-testid={`start-${d.id}`}>ابدأ المهمة</Btn>}
          {v.status === 'locked' && <small>🔒 {v.lockReasonAr}</small>}
        </div>
      )}
    </div>
  );
}
function Missions() {
  const c = useGame(), views = missionViews(c.state);
  const main = views.filter((v) => v.def.category === 'main'), rep = views.filter((v) => v.def.category === 'repeatable');
  return (
    <>
      <Section title={`المهمات الرئيسية (${num(main.filter((m) => m.status === 'completed').length)} / ${num(main.length)})`}>{main.map((v) => <MissionCard key={v.def.id} v={v} />)}</Section>
      <Section title="مهمات اختيارية متجددة">{rep.map((v) => <MissionCard key={v.def.id} v={v} />)}</Section>
    </>
  );
}

/* ------------------------------------------------------------------ Construction & upgrades */
function Build() {
  const c = useGame(), s = c.state;
  return (
    <Section title={`الترقيات (${num(s.upgrades.length)} / ${num(UPGRADES.length)})`}>
      {UPGRADES.map((u) => {
        const owned = s.upgrades.includes(u.id), gated = !!u.flag && !FLAGS[u.flag], need = u.requires?.filter((r) => !s.upgrades.includes(r)) ?? [];
        return (
          <div key={u.id} className={`card upgrade ${owned ? 'is-owned' : ''} ${gated ? 'is-gated' : ''}`}>
            <div className="row">
              <div><b>{num(u.order)}. {u.nameAr}</b><small>{u.effectAr}</small></div>
              {owned ? <Pill tone="good">مُنجزة</Pill> : gated ? <Pill tone="muted">قيد التطوير</Pill> :
                <Btn kind={s.money >= u.cost && !need.length ? 'gold' : 'ghost'} disabled={s.money < u.cost || !!need.length} onClick={() => c.dispatch({ type: 'buyUpgrade', id: u.id })} data-testid={`buy-${u.id}`}>{iqd(u.cost)}</Btn>}
            </div>
            {!owned && !gated && !!need.length && <small>🔒 تتطلب: {need.map((r) => UPGRADES.find((x) => x.id === r)!.nameAr).join('، ')}</small>}
            {gated && <small>تُفتح مع توسعة القاعات الست بعد اعتماد القاعة الأولى بصرياً.</small>}
          </div>
        );
      })}
    </Section>
  );
}

/* ------------------------------------------------------------------ Staff */
function StaffPanel() {
  const c = useGame(), s = c.state;
  return (
    <>
      <Section title="فريق العمل">
        {ROLES.map((r) => {
          const st = s.staff.find((x) => x.role === r.id);
          if (!st) return (
            <div key={r.id} className="card">
              <div className="row"><div><b>{r.nameAr}</b><small>{r.dutyAr} · شاغرة</small></div>
                <Btn kind={s.money >= r.hireCost ? 'gold' : 'ghost'} disabled={s.money < r.hireCost} onClick={() => c.dispatch({ type: 'hire', role: r.id })} data-testid={`hire-${r.id}`}>تعيين {iqd(r.hireCost)}</Btn></div>
            </div>
          );
          return (
            <div key={r.id} className="card" onClick={() => { c.select({ kind: 'staff', id: st.id }); c.world?.focus(st.x, st.z); }}>
              <div className="row"><div><b>{st.name} — {r.nameAr}</b><small>{STAFF_STATE_AR[st.state]} · {r.id === 'cleaner' ? 'يتحرك داخل منطقة التنظيف فقط' : 'ثابت في موقع عمله'}</small></div><Pill tone="gold">مستوى {num(st.level)}</Pill></div>
              <Bar label="المعنويات" value={st.morale} /><Bar label="الطاقة" value={st.energy} />
              <div className="grid3"><Stat label="الكفاءة" value={pct(efficiencyOf(st) * 100)} /><Stat label="أنجز اليوم" value={num(st.servedToday)} /><Stat label="الراتب اليومي" value={iqd(salaryOf(st))} /></div>
              <div className="row"><small>الخبرة: {num(st.xp)} · إجمالي المنجز: {num(st.servedTotal)}{st.serviceTime ? ` · زمن الخدمة ${dec1(st.serviceTime)} ث` : ''}</small>
                {st.level < BALANCE.maxStaffLevel ? <Btn kind="ghost" disabled={s.money < trainCostOf(st)} onClick={(e) => { e.stopPropagation(); c.dispatch({ type: 'train', staffId: st.id }); }} data-testid={`train-${r.id}`}>تدريب {iqd(trainCostOf(st))}</Btn> : <Pill tone="good">أعلى مستوى</Pill>}</div>
            </div>
          );
        })}
      </Section>
      <p className="note">موظفو الخدمة يبقون في مواقع عملهم دائماً. عامل النظافة فقط يتنقل، وضمن منطقته المحددة.</p>
    </>
  );
}

/* ------------------------------------------------------------------ Services */
function Services() {
  const c = useGame(), s = c.state;
  return (
    <Section title="الخدمات الأربع">
      {(Object.keys(SERVICES) as ServiceId[]).map((id) => {
        const d = SERVICES[id], open = !d.unlock || s.upgrades.includes(d.unlock), staff = s.staff.find((x) => x.role === d.role);
        const q = id === 'reading' ? null : s.queues[id as 'borrow'], slot = id === 'reading' ? null : s.service[id as 'borrow'];
        const head = q && s.visitors.find((v) => v.id === q[0]);
        return (
          <div key={id} className={`card ${open ? '' : 'is-gated'}`}>
            <div className="row"><div><b>{d.icon} {d.nameAr}</b><small>الأجر {iqd(d.reward)} · المدة {dec1(d.duration)} ث</small></div>
              <Pill tone={open ? 'good' : 'muted'}>{open ? 'تعمل' : 'مقفلة'}</Pill></div>
            {!open && <small>🔒 تُفتح بترقية «{UPGRADES.find((u) => u.id === d.unlock)!.nameAr}»</small>}
            {open && q && (
              <>
                <Bar label={`الطابور (${num(q.length)} / ${num(Math.min(BALANCE.queueCapacity, QUEUES[id as 'borrow'].length))})`} value={(q.length / Math.min(BALANCE.queueCapacity, QUEUES[id as 'borrow'].length)) * 100} invert />
                {slot && <Bar label={slot.by === 'staff' ? `${staff?.name ?? ''} يخدم طالباً` : 'المدير يخدم بنفسه'} value={(slot.t / slot.dur) * 100} />}
                <div className="row"><small>{staff ? `${staff.name} (${STAFF_STATE_AR[staff.state]})` : 'لا يوجد موظف: اخدم بنفسك بالنقر على المكتب'}</small>
                  {(!staff || staff.state === 'break') && <Btn kind="gold" disabled={!!slot || head?.state !== 'queue'} onClick={() => c.dispatch({ type: 'serve', service: id as 'borrow' })} data-testid={`serve-${id}`}>اخدم الآن</Btn>}</div>
              </>
            )}
            {open && id === 'reading' && <small>{num(s.visitors.filter((v) => v.state === 'sit' && v.activity !== 'computer').length)} قارئ الآن · اليوم {num(s.ledger.byService.reading)} جلسة</small>}
            {open && id !== 'reading' && <small>أُنجز اليوم: {num(s.ledger.byService[id])}</small>}
          </div>
        );
      })}
    </Section>
  );
}

/* ------------------------------------------------------------------ Visitors */
function Visitors() {
  const c = useGame(), s = c.state, by: Record<string, number> = {};
  for (const v of s.visitors) by[v.need] = (by[v.need] ?? 0) + 1;
  const seatsOwned = SEATS.filter((x) => !x.requires || s.upgrades.includes(x.requires));
  const used = (k: 'read' | 'pc') => seatsOwned.filter((x) => x.kind === k && s.seats[x.id] !== undefined).length, total = (k: 'read' | 'pc') => seatsOwned.filter((x) => x.kind === k).length;
  return (
    <>
      <div className="grid2"><Stat icon="👥" label="داخل القاعة الآن" value={num(s.visitors.length)} /><Stat icon="🎓" label="إجمالي الزوار" value={num(s.totals.visitors)} /></div>
      <Section title="الطاقة الاستيعابية">
        <Bar label={`مقاعد المطالعة ${num(used('read'))} / ${num(total('read'))}`} value={(used('read') / Math.max(1, total('read'))) * 100} invert />
        <Bar label={`الحاسبات ${num(used('pc'))} / ${num(total('pc'))}`} value={(used('pc') / Math.max(1, total('pc'))) * 100} invert />
        <Bar label={`الرفوف المشغولة ${num(Object.keys(s.shelfUsers).length)} / ${num(SHELVES.length)}`} value={(Object.keys(s.shelfUsers).length / SHELVES.length) * 100} invert />
      </Section>
      <Section title="احتياجات الزوار الحاليين">{Object.entries(NEED_AR).map(([k, label]) => <div className="row slim" key={k}><span>{label}</span><b>{num(by[k] ?? 0)}</b></div>)}</Section>
      <Section title="الزوار">
        {s.visitors.slice(0, 14).map((v) => (
          <button key={v.id} className="row slim link" onClick={() => { c.select({ kind: 'visitor', id: v.id }); c.world?.focus(v.x, v.z); }}>
            <span>{v.vip ? '⭐ ضيف أكاديمي' : `طالب #${num(v.id)}`} · {NEED_AR[v.need]}</span><small>{STATE_AR[v.state] ?? v.state}{v.activity === 'write' ? ' (يكتب)' : v.activity === 'read' ? ' (يقرأ)' : v.activity === 'computer' ? ' (على الحاسبة)' : ''}</small>
          </button>
        ))}
        {!s.visitors.length && <p className="note">لا يوجد زوار حالياً.</p>}
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Library overview */
function Library() {
  const c = useGame(), s = c.state;
  return (
    <>
      <Section title="خطة توسعة القاعات ثلاثية الأبعاد">
        <p className="tip">🏛️ جميع القاعات مخطّط لها بنفس محرك اللعبة والتجسيم. تُضاف المجسمات والخدمات واحدة بعد الثانية، ولا يُسمح بشراء قاعة غير مكتملة.</p>
        {HALL_ROADMAP.map((h, i) => {
          const status = hallProgress(h.upgradeId, s.upgrades);
          const cost = hallExpansionCost(h.upgradeId);
          return (
            <div key={h.id} className="card" data-testid={`hall-roadmap-${h.id}`}>
              <div className="row">
                <div><b>{h.icon} {num(i + 1)}. {h.nameAr}</b><small>{h.roleAr}</small></div>
                <Pill tone={status === 'playable' ? 'good' : 'muted'}>
                  {status === 'playable' ? 'متاحة للعب' : status === 'in-development' ? 'قيد البناء' : status === 'unlocked' ? 'تم شراؤها' : 'مقفلة'}
                </Pill>
              </div>
              {h.upgradeId && <small>تكلفة الفتح المخططة: {iqd(cost)} · {status === 'in-development' ? 'لا تُخصم أي أموال قبل جاهزية القاعة.' : 'تتم إدارة التوسعة من الترقيات.'}</small>}
            </div>
          );
        })}
        <p className="note">هذا مخطط للعبة، وليس خريطة حقيقية لمبنى المكتبة. حالياً قاعة الخوارزمي وحدها مجسمة وقابلة للعب.</p>
      </Section>
      <Section title="مناطق قاعة الخوارزمي">
        {ZONES.map((z) => {
          const n = s.visitors.filter((v) => zoneAt(v.x, v.z)?.id === z.id).length;
          return <button key={z.id} className="row slim link" onClick={() => { c.select({ kind: 'zone', id: z.id }); c.world?.focus((z.minX + z.maxX) / 2, (z.minZ + z.maxZ) / 2); }}><span>{z.nameAr}</span><small>{z.kind === 'quiet' ? 'منطقة هادئة' : 'منطقة نشطة'} · {num(n)} زائر</small></button>;
        })}
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Events */
function eventOptionImpact(o: EventOption): string {
  const effects: string[] = [];
  if (o.money) effects.push(`الكلفة ${iqd(Math.abs(o.money))}`);
  if (o.satisfaction) effects.push(`الرضا ${o.satisfaction > 0 ? '+' : ''}${num(o.satisfaction)}`);
  if (o.reputation) effects.push(`المكانة ${o.reputation > 0 ? '+' : ''}${num(o.reputation)}`);
  if (o.cleanliness) effects.push(`النظافة ${o.cleanliness > 0 ? '+' : ''}${num(o.cleanliness)}`);
  if (o.visitors) effects.push(`زوار إضافيون حتى ${num(o.visitors)}`);
  return effects.length ? effects.join(' · ') : 'بدون تأثير مباشر';
}

function Events() {
  const c = useGame(), s = c.state, ev = s.event ? EVENT_BY_ID[s.event.id] : null;
  const dev: Record<string, string> = { printer: 'الطابعة', pc_1: 'حاسبة ١', pc_2: 'حاسبة ٢', pc_3: 'حاسبة ٣', pc_4: 'حاسبة ٤' };
  return (
    <>
      <Section title="حدث يحتاج قرارك">
        {ev ? <div className="card"><b>{ev.icon} {ev.titleAr}</b><p>{ev.bodyAr}</p><small>يُحسم تلقائياً بعد {mmss(s.event!.t)}</small>
          <div className="col">{ev.options.map((o, i) => (
            <div key={i} className="col" style={{ gap: 4 }}>
              <Btn kind={i === 0 ? 'gold' : 'ghost'} disabled={!!o.money && o.money < 0 && s.money < -o.money} onClick={() => c.dispatch({ type: 'eventChoice', choice: i })}>{o.textAr}</Btn>
              <small className="note" data-testid={`event-impact-${i}`}>{eventOptionImpact(o)}{o.money && o.money < 0 && s.money < -o.money ? ' · الرصيد لا يكفي' : ''}</small>
            </div>
          ))}</div></div>
          : <p className="note">لا يوجد حدث حالياً. الأحداث تظهر أثناء الدوام وتحتاج قراراً منك.</p>}
      </Section>
      <Section title="حالة الأجهزة">{Object.entries(dev).map(([id, label]) => <div className="row slim" key={id}><span>{label}</span><Pill tone={s.broken.includes(id as never) ? 'bad' : 'good'}>{s.broken.includes(id as never) ? 'عاطل — انقر عليه في القاعة' : 'يعمل'}</Pill></div>)}</Section>
      <Section title="حالة التشغيل">
        <div className="row slim"><span>ضغط الزوار</span><Pill tone={s.rush ? 'gold' : 'muted'}>{s.rush ? 'ذروة' : 'اعتيادي'}</Pill></div>
        <div className="row slim"><span>بقع تحتاج تنظيفاً</span><b>{num(s.dirt.length)}</b></div>
        <div className="row slim"><span>أحداث مرّت</span><b>{num(s.eventsSeen)}</b></div>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Achievements */
function Achievements() {
  const c = useGame(), s = c.state;
  return (
    <Section title={`الإنجازات (${num(s.achievements.length)} / ${num(ACHIEVEMENTS.length)})`}>
      {ACHIEVEMENTS.map((a) => { const got = s.achievements.includes(a.id); return <div key={a.id} className={`card ach ${got ? 'is-owned' : 'is-gated'}`}><span className="ach__icon">{got ? a.icon : '🔒'}</span><div><b>{a.titleAr}</b><small>{a.descAr}</small></div></div>; })}
    </Section>
  );
}

/* ------------------------------------------------------------------ Finance & reports */
function Finance() {
  const c = useGame(), s = c.state, l = s.ledger, salaries = s.staff.reduce((a, st) => a + salaryOf(st), 0);
  return (
    <>
      <div className="grid2"><Stat icon="💰" label="الرصيد" value={iqd(s.money)} tone="good" /><Stat icon="📈" label="إجمالي الإيرادات" value={iqd(s.totals.earned)} />
        <Stat icon="➕" label="إيراد اليوم" value={iqd(l.income)} tone="good" /><Stat icon="➖" label="مصروف اليوم" value={iqd(l.expenses)} tone="bad" />
        <Stat icon="👔" label="رواتب نهاية اليوم" value={iqd(salaries)} /><Stat icon="🧮" label="صافي اليوم المتوقع" value={iqd(l.income - l.expenses - salaries)} tone={l.income - l.expenses - salaries >= 0 ? 'good' : 'bad'} /></div>
      <Section title="إيراد اليوم حسب الخدمة">{(Object.keys(SERVICES) as ServiceId[]).map((id) => <div className="row slim" key={id}><span>{SERVICES[id].icon} {SERVICES[id].nameAr}</span><b>{num(l.byService[id])} × {iqd(SERVICES[id].reward)}</b></div>)}</Section>
      <Section title="تقارير الأيام السابقة">
        {s.reports.length ? <table className="table"><thead><tr><th>اليوم</th><th>الإيراد</th><th>المصروف</th><th>الخدمات</th><th>الرضا</th></tr></thead>
          <tbody>{s.reports.slice(0, 10).map((r) => <tr key={r.day}><td>{num(r.day)}</td><td>{num(r.income)}</td><td>{num(r.expenses)}</td><td>{num(r.served)}</td><td>{pct(r.satisfaction)}</td></tr>)}</tbody></table>
          : <p className="note">يظهر أول تقرير بعد انتهاء اليوم الأول.</p>}
      </Section>
      <p className="note">العملة دينار عراقي افتراضي داخل اللعبة فقط.</p>
    </>
  );
}

/* ------------------------------------------------------------------ Settings, save & credits */
function Settings() {
  const c = useGame(), st = c.settings, file = useRef<HTMLInputElement>(null), [msg, setMsg] = useState('');
  const stats = c.world?.stats();
  const exportSave = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c.exportSave()], { type: 'application/json' })); a.download = `library-tycoon-day${c.state.day}.json`; a.click(); setMsg('تم تصدير ملف الحفظ.'); };
  const importSave = async (f: File | undefined) => { if (!f) return; setMsg(c.importSave(await f.text()) ? 'تم استيراد الحفظ بنجاح.' : 'ملف غير صالح. لم يتغير شيء.'); };
  return (
    <>
      <Section title="جودة العرض">
        <div className="seg">{(['low', 'medium', 'high'] as const).map((q) => <button key={q} className={st.quality === q ? 'is-on' : ''} onClick={() => c.updateSettings({ quality: q })} data-testid={`quality-${q}`}>{q === 'low' ? 'خفيفة (٣٠ إطار)' : q === 'medium' ? 'متوسطة' : 'عالية'}</button>)}</div>
        <label className="row slim"><span>دقة العرض {pct(st.renderScale * 100)}</span><input type="range" min={0.5} max={1} step={0.05} value={st.renderScale} onChange={(e) => c.updateSettings({ renderScale: Number(e.target.value) })} /></label>
        <label className="row slim"><span>المؤثرات الصوتية</span><input type="checkbox" checked={st.sound} onChange={(e) => c.updateSettings({ sound: e.target.checked })} /></label>
        <label className="row slim"><span>إظهار عدّاد الإطارات</span><input type="checkbox" checked={st.showFps} onChange={(e) => c.updateSettings({ showFps: e.target.checked })} /></label>
        {stats && <small dir="ltr">{stats.fps.toFixed(0)} FPS · {stats.drawCalls} draw calls · {Math.round(stats.triangles / 1000)}k tris</small>}
      </Section>
      <Section title="الحفظ والمتابعة">
        <p className="note">يُحفظ تقدّمك تلقائياً على هذا الجهاز مع نسخة احتياطية.{c.lastSavedAt ? ` آخر حفظ: ${new Date(c.lastSavedAt).toLocaleTimeString('ar-IQ')}` : ''}</p>
        <div className="col">
          <Btn kind="gold" onClick={() => setMsg(c.save() ? 'تم الحفظ.' : 'تعذّر الحفظ على هذا المتصفح.')} data-testid="save-now">حفظ الآن</Btn>
          <Btn kind="ghost" onClick={exportSave}>تصدير ملف الحفظ</Btn>
          <Btn kind="ghost" onClick={() => file.current?.click()}>استيراد ملف حفظ</Btn>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void importSave(e.target.files?.[0])} />
          <Btn kind="ghost" disabled={!c.saves.hasBackup()} onClick={() => setMsg(c.rollback() ? 'تم الرجوع إلى الحفظ السابق.' : 'لا توجد نسخة سابقة صالحة.')}>الرجوع للحفظ السابق</Btn>
          <Btn kind="danger" onClick={() => { if (confirm('بدء لعبة جديدة؟ يبقى حفظك الحالي كنسخة احتياطية يمكن الرجوع لها.')) { c.newGame(); setMsg('بدأت لعبة جديدة.'); } }}>لعبة جديدة</Btn>
        </div>
        {msg && <p className="note" role="status">{msg}</p>}
      </Section>
      <Section title="التحكم">
        <p className="note">السحب بالفأرة أو الأسهم / WASD للتحريك · العجلة أو + و − للتكبير · Home لإعادة الكاميرا. دوران الكاميرا مقفل.</p>
      </Section>
      <Section title="عن اللعبة">
        <div className="credits">
          <img src="assets/branding/central-library-logo.png" alt="شعار المكتبة المركزية — الجامعة التكنولوجية" />
          <div>
            <b>Library Tycoon — الإصدار ٣٫٠ (تجريبي)</b>
            <p>المكتبة المركزية · الجامعة التكنولوجية · بغداد</p>
            <p className="credit-name">م.م. سامر رعد عزاوي</p>
            <p>ماجستير هندسة الحاسبات</p>
            <p>هندسة البرمجيات المدعومة بالذكاء الاصطناعي وتطوير الأنظمة الوكيلة</p>
            <p dir="ltr" className="credit-en">Asst. Lecturer Samer Raad Azzawi<br />M.Sc. in Computer Engineering<br />AI-Assisted Software Engineering &amp; Agentic Development</p>
            <small>المجسمات الخارجية: Kenney (CC0). المحرك: Babylon.js (Apache-2.0). التفاصيل في THIRD_PARTY_NOTICES.md.</small>
          </div>
        </div>
      </Section>
    </>
  );
}

export function PanelBody({ id, go }: { id: PanelId; go: (p: PanelId) => void }): ReactNode {
  switch (id) {
    case 'home': return <Home go={go} />;
    case 'missions': return <Missions />;
    case 'build': return <Build />;
    case 'staff': return <StaffPanel />;
    case 'services': return <Services />;
    case 'visitors': return <Visitors />;
    case 'library': return <Library />;
    case 'events': return <Events />;
    case 'achievements': return <Achievements />;
    case 'finance': return <Finance />;
    case 'settings': return <Settings />;
  }
}
export { MISSION_BY_ID };
