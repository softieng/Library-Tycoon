import { useEffect, useState } from 'react';
import { BALANCE } from '../config/balance';
import { DEWEY } from '../config/dewey';
import { EVENT_BY_ID } from '../config/events';
import { SHELVES, ZONES, zoneAt } from '../config/layout';
import { ROLE_BY_ID, SERVICES } from '../config/services';
import { DIFFICULT_CASES, LOST_WANTS, MISSION_BY_ID } from '../missions/definitions';
import { nextMainMission } from '../missions/engine';
import { efficiencyOf, trainCostOf } from '../staff/staff';
import { clockText, dec1, iqd, mmss, num, pct, useGame } from './hooks';
import type { PanelId } from './panels';
import { Bar, Btn, Pill } from './widgets';

export function TopBar() {
  const c = useGame(), s = c.state, queue = s.queues.borrow.length + s.queues.print.length + s.queues.research.length;
  const chip = (icon: string, label: string, value: string, id: string, tone = '') => <div className={`chip ${tone}`} title={label} data-testid={`hud-${id}`}><span>{icon}</span><div><small>{label}</small><b>{value}</b></div></div>;
  return (
    <header className="topbar">
      <div className="brand">
        <img src="assets/branding/central-library-logo.png" alt="شعار المكتبة المركزية — الجامعة التكنولوجية" />
        <div><b>Library Tycoon</b><small>المكتبة المركزية · الجامعة التكنولوجية</small></div>
      </div>
      <div className="chips">
        {chip('💰', 'الرصيد', iqd(s.money), 'money', 'chip--gold')}
        {chip('📅', `اليوم ${num(s.day)}`, s.phase === 'closing' ? 'إغلاق' : clockText(s.clock, BALANCE.dayLength), 'time')}
        {chip('😊', 'الرضا', pct(s.satisfaction), 'satisfaction', s.satisfaction < 60 ? 'chip--bad' : '')}
        {chip('✨', 'النظافة', pct(s.cleanliness), 'cleanliness', s.cleanliness < 60 ? 'chip--bad' : '')}
        {chip('⭐', 'السمعة', dec1(s.reputation), 'reputation')}
        {chip('👥', 'الزوار', num(s.visitors.length), 'visitors')}
        {chip('✔️', 'خدمات اليوم', num(s.ledger.served), 'served')}
        {chip('⏳', 'الطابور', num(queue), 'queue', queue >= 5 ? 'chip--bad' : '')}
      </div>
      <div className="speed" role="group" aria-label="سرعة اللعبة">
        {[0, 1, 2, 3].map((v) => <button key={v} className={(c.paused ? 0 : c.speed) === v ? 'is-on' : ''} onClick={() => c.setSpeed(v)} aria-label={v ? `سرعة ${v}` : 'إيقاف مؤقت'} data-testid={`speed-${v}`}>{v === 0 ? '⏸' : `${num(v)}×`}</button>)}
      </div>
    </header>
  );
}

export function MissionTracker({ open }: { open: (p: PanelId) => void }) {
  const c = useGame(), s = c.state, run = s.missions.active, [collapsed, setCollapsed] = useState(false);
  const next = !run ? nextMainMission(s) : null, last = s.missions.lastResult;
  if (!run && !next) return null;
  const d = MISSION_BY_ID[(run?.id ?? next!.id)];
  return (
    <aside className={`tracker ${collapsed ? 'is-collapsed' : ''}`} data-testid="tracker">
      <button className="tracker__head" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>
        <span>{d.icon} {run ? 'المهمة الحالية' : 'المهمة التالية'}: <b>{d.titleAr}</b></span>{run?.timeLeft != null && <Pill tone="gold">⏱ {mmss(run.timeLeft)}</Pill>}<span className="chev">{collapsed ? '▴' : '▾'}</span>
      </button>
      {!collapsed && (run ? (
        <div className="tracker__body">
          {d.objectives.map((o) => { const cur = o.kind === 'count' ? run.progress[o.id] : s[o.stat], max = o.kind === 'count' ? o.count : o.gte; return <Bar key={o.id} label={o.textAr} value={Math.min(100, (cur / max) * 100)} text={o.kind === 'count' ? `${num(cur)} / ${num(max)}` : pct(cur)} />; })}
          {run.id === 'missing_book' && <p className="hint">📕 «{String(run.data.title)}» — مكانه الصحيح رف {String(run.data.home)}، لكنه وُضع على رف آخر.{run.data.hint ? ` آخر تلميح: ${String(run.data.hint)}` : ' انقر على رف لتفتيشه.'}</p>}
          {run.id === 'find_reference' && <p className="hint">🔎 الطالبة تطلب: «{String(run.data.title)}». انقر على الرف ذي التصنيف المناسب.</p>}
          {run.id !== 'missing_book' && run.id !== 'find_reference' && <p className="hint">🧭 {d.howAr}</p>}
        </div>
      ) : (
        <div className="tracker__body">
          <p>{d.descriptionAr}</p>
          <div className="row"><small>المكافأة <b>{iqd(d.reward.money)}</b></small><Btn kind="gold" onClick={() => c.dispatch({ type: 'startMission', id: d.id })} data-testid="tracker-start">ابدأ المهمة</Btn></div>
          {last && s.playTime - last.at < 20 && <small className={last.status === 'completed' ? 'ok' : 'fail'}>{last.status === 'completed' ? `✔ أكملت «${MISSION_BY_ID[last.id].titleAr}»` : `✖ لم تكتمل «${MISSION_BY_ID[last.id].titleAr}»`}</small>}
          <button className="linkbtn" onClick={() => open('missions')}>كل المهمات ←</button>
        </div>
      ))}
    </aside>
  );
}

const NEED_AR: Record<string, string> = { borrow: 'يريد استعارة كتاب', read: 'يريد مكاناً للمطالعة', computer: 'يريد استخدام الحاسبة', research: 'يحتاج مساعدة مرجعية', print: 'يريد طباعة أوراق' };
const STATE_AR: Record<string, string> = { enter: 'يدخل القاعة', toShelf: 'متجه للرفوف', browse: 'يتصفح الرفوف', toQueue: 'متجه للطابور', queue: 'ينتظر في الطابور', served: 'يُخدَم الآن', toSeat: 'متجه لمقعد', sit: 'جالس', leave: 'يغادر', lost: 'يحتاج مساعدتك', follow: 'يتبع الحارس الصغير' };

export function Inspector() {
  const c = useGame(), s = c.state, sel = c.selection;
  if (!sel) return null;
  let title = '', lines: string[] = [], actions: React.ReactNode = null;
  if (sel.kind === 'visitor') {
    const v = s.visitors.find((x) => x.id === sel.id); if (!v) return null;
    title = v.vip ? '⭐ ضيف أكاديمي' : `🎓 طالب #${num(v.id)}`;
    lines = [NEED_AR[v.need], STATE_AR[v.state] ?? '', v.activity === 'write' ? 'يكتب ملاحظاته' : v.activity === 'read' ? 'يقرأ كتاباً' : v.activity === 'computer' ? 'يعمل على الحاسبة' : '', v.queue ? `صبره: ${pct((v.patience / BALANCE.patience) * 100)}` : '', v.carrying ? 'يحمل كتاباً' : ''].filter(Boolean);
  } else if (sel.kind === 'staff') {
    const st = s.staff.find((x) => x.id === sel.id); if (!st) return null;
    title = `👤 ${st.name} — ${ROLE_BY_ID[st.role].nameAr}`;
    lines = [`المستوى ${num(st.level)} · الكفاءة ${pct(efficiencyOf(st) * 100)}`, `المعنويات ${pct(st.morale)} · أنجز اليوم ${num(st.servedToday)}`, st.role === 'cleaner' ? 'يتحرك داخل منطقة التنظيف فقط' : 'ثابت في موقع عمله'];
    actions = st.level < BALANCE.maxStaffLevel ? <Btn kind="gold" disabled={s.money < trainCostOf(st)} onClick={() => c.dispatch({ type: 'train', staffId: st.id })}>تدريب {iqd(trainCostOf(st))}</Btn> : null;
  } else if (sel.kind === 'shelf') {
    const sh = SHELVES.find((x) => x.id === sel.id); if (!sh) return null; const d = DEWEY.find((x) => x.code === sh.code)!;
    title = `📚 رف ${d.code}`; lines = [d.nameAr, s.shelfUsers[sh.id] !== undefined ? 'طالب يتصفح هذا الرف الآن' : 'شاغر', s.missions.active?.id === 'missing_book' ? 'الحارس الصغير يفتّش الرف عند النقر عليه' : ''].filter(Boolean);
  } else if (sel.kind === 'mascot') {
    const wait = c.mascotWait(); title = '🎓 الحارس الصغير — تميمة المكتبة المركزية';
    lines = [wait <= 0 ? 'هديته جاهزة: انقر عليه لتستلم ٢٥٬٠٠٠ د.ع' : `الهدية القادمة بعد ${mmss(wait)}`, `استلمت الهدية ${num(s.mascot.rewardsClaimed)} مرة`];
    actions = <Btn kind="gold" disabled={wait > 0} onClick={() => c.dispatch({ type: 'mascotReward', now: Date.now() })} data-testid="mascot-gift">استلام الهدية</Btn>;
  } else if (sel.kind === 'zone') {
    const z = ZONES.find((x) => x.id === sel.id); if (!z) return null;
    title = `🗺️ ${z.nameAr}`; lines = [z.kind === 'quiet' ? 'منطقة هادئة' : 'منطقة نشطة', `${num(s.visitors.filter((v) => zoneAt(v.x, v.z)?.id === z.id).length)} زائر الآن`];
  } else if (sel.kind === 'station') {
    const d = SERVICES[sel.id as 'borrow']; if (!d) return null; const staff = s.staff.find((x) => x.role === d.role), q = s.queues[sel.id as 'borrow'];
    title = `${d.icon} ${d.nameAr}`; lines = [`في الطابور: ${num(q.length)}`, staff ? `${staff.name} في الخدمة` : 'لا يوجد موظف: انقر على المكتب لتخدم بنفسك', `الأجر ${iqd(d.reward)}`];
    actions = !staff || staff.state === 'break' ? <Btn kind="gold" disabled={!q.length || !!s.service[sel.id as 'borrow']} onClick={() => c.dispatch({ type: 'serve', service: sel.id as 'borrow' })}>اخدم الآن</Btn> : null;
  } else if (sel.kind === 'device') {
    const broken = s.broken.includes(sel.id as never); title = sel.id === 'printer' ? '🖨️ الطابعة' : '🖥️ حاسبة البحث'; lines = [broken ? 'عاطلة — اختر طريقة الإصلاح' : 'تعمل بشكل طبيعي'];
  } else { title = '📦 عربة الكتب المُرجَعة'; lines = ['انقر عليها لتصنيف الكتب حسب ديوي']; }
  return (
    <aside className="inspector" data-testid="inspector">
      <header><b>{title}</b><button className="x" onClick={() => c.select(null)} aria-label="إغلاق">✕</button></header>
      {lines.map((l) => <p key={l}>{l}</p>)}{actions}
    </aside>
  );
}

export function Toasts() {
  const c = useGame();
  return <div className="toasts" aria-live="polite">{c.toasts.map((t) => <div key={t.id} className={`toast toast--${t.tone}`}>{t.text}</div>)}</div>;
}
export function Floaters() {
  const c = useGame();
  return <>{c.floaters.map((f) => { const p = f.x !== undefined && c.world ? c.world.project(f.x, 2.2, f.z!) : null; if (!p) return null; return <div key={f.id} className={`floater ${f.amount < 0 ? 'floater--neg' : ''}`} style={{ left: p.x, top: p.y }}>{f.amount > 0 ? '+' : ''}{num(f.amount)}</div>; })}</>;
}

export function Dialogs() {
  const c = useGame(), s = c.state, dlg = s.missions.dialog, ev = s.event ? EVENT_BY_ID[s.event.id] : null;
  const close = () => c.dispatch({ type: 'closeDialog' });
  if (dlg?.kind === 'guide') {
    const v = s.visitors.find((x) => x.id === dlg.visitorId), want = v?.lostWant != null ? LOST_WANTS[Number(v.lostWant)] : null;
    if (!want) return null;
    return (
      <div className="modal" role="dialog" aria-modal="true" data-testid="dlg-guide"><div className="modal__card">
        <header><h2>🧭 طالب يحتاج توجيهاً</h2><button className="x" onClick={close} aria-label="إغلاق">✕</button></header>
        <blockquote>«{want.say}»</blockquote><p>إلى أين يرافقه الحارس الصغير؟</p>
        <div className="col">{['borrowing', 'reference', 'reading', 'computers'].map((z) => <Btn key={z} kind="ghost" onClick={() => c.dispatch({ type: 'guideChoice', zone: z })} data-zone={z} data-answer={z === want.zone ? '1' : '0'}>{ZONES.find((q) => q.id === z)!.nameAr}</Btn>)}</div>
      </div></div>
    );
  }
  if (dlg?.kind === 'difficult') {
    const sc = DIFFICULT_CASES[dlg.scenario ?? 0];
    return (
      <div className="modal" role="dialog" aria-modal="true" data-testid="dlg-difficult"><div className="modal__card">
        <header><h2>🗂️ طلب استعارة صعب</h2><button className="x" onClick={close} aria-label="إغلاق">✕</button></header>
        <blockquote>«{sc.ask}»</blockquote><p>ما القرار المناسب وفق تعليمات المكتبة؟</p>
        <div className="col">{sc.options.map((o, i) => <Btn key={i} kind="ghost" onClick={() => c.dispatch({ type: 'dialogChoice', choice: i })} data-answer={i === sc.correct ? '1' : '0'}>{o}</Btn>)}</div>
      </div></div>
    );
  }
  if (dlg?.kind === 'repair') {
    const clerk = s.staff.find((x) => x.role === 'digital'), chance = Math.round((0.45 + (clerk ? 0.15 + 0.07 * clerk.level : 0)) * 100);
    return (
      <div className="modal" role="dialog" aria-modal="true" data-testid="dlg-repair"><div className="modal__card">
        <header><h2>🔧 {dlg.device === 'printer' ? 'الطابعة عاطلة' : 'الحاسبة خارج الخدمة'}</h2><button className="x" onClick={close} aria-label="إغلاق">✕</button></header>
        <p>اختر طريقة الإصلاح:</p>
        <div className="col">
          <Btn kind="gold" disabled={s.money < BALANCE.technicianCost} onClick={() => c.dispatch({ type: 'repairChoice', choice: 'technician' })} data-testid="repair-tech">فني خارجي — مضمون ({iqd(BALANCE.technicianCost)})</Btn>
          <Btn kind="ghost" onClick={() => c.dispatch({ type: 'repairChoice', choice: 'self' })} data-testid="repair-self">محاولة إصلاح ذاتي — مجاناً (فرصة النجاح {pct(chance)})</Btn>
        </div>
        <small>{clerk ? `${clerk.name} يرفع فرصة الإصلاح الذاتي.` : 'تعيين موظف الخدمات الرقمية يرفع فرصة الإصلاح الذاتي.'}</small>
      </div></div>
    );
  }
  if (ev) {
    return (
      <aside className="eventcard" data-testid="event">
        <b>{ev.icon} {ev.titleAr}</b><p>{ev.bodyAr}</p>
        <div className="col">{ev.options.map((o, i) => <Btn key={i} kind={i === 0 ? 'gold' : 'ghost'} onClick={() => c.dispatch({ type: 'eventChoice', choice: i })}>{o.textAr}</Btn>)}</div>
        <small>يُحسم تلقائياً بعد {mmss(s.event!.t)}</small>
      </aside>
    );
  }
  return null;
}

/** Celebration card shown when a mission is completed (driven by the simulation event). */
export function MissionResult() {
  const c = useGame(), [shown, setShown] = useState<{ id: string; status: 'completed' | 'failed'; reward: number } | null>(null);
  useEffect(() => c.onSimEvent((e) => { if (e.type === 'mission' && e.status !== 'started') { const r = c.state.missions.lastResult; if (r) setShown({ id: r.id, status: r.status, reward: r.reward }); } }), [c]);
  if (!shown) return null;
  const d = MISSION_BY_ID[shown.id], ok = shown.status === 'completed';
  return (
    <div className="modal modal--soft" role="dialog" aria-modal="true" data-testid="mission-result">
      <div className={`modal__card result ${ok ? 'result--ok' : 'result--fail'}`}>
        <div className="result__icon">{ok ? '🏆' : '⌛'}</div>
        <h2>{ok ? 'اكتملت المهمة!' : 'لم تكتمل المهمة'}</h2>
        <h3>{d.icon} {d.titleAr}</h3>
        {ok ? <p className="reward">المكافأة: <b>+{iqd(shown.reward)}</b></p> : <p>يمكنك إعادة المحاولة بعد قليل من لوحة المهمات.</p>}
        <Btn kind="gold" onClick={() => setShown(null)} data-testid="mission-result-ok">متابعة</Btn>
      </div>
    </div>
  );
}

export function CameraControls() {
  const c = useGame(), st = c.settings.showFps ? c.world?.stats() : null;
  return (
    <div className="camctl">
      <button onClick={() => c.world?.zoom(1)} aria-label="تكبير" data-testid="zoom-in">＋</button>
      <button onClick={() => c.world?.zoom(-1)} aria-label="تصغير" data-testid="zoom-out">－</button>
      <button onClick={() => c.world?.resetCamera()} aria-label="إعادة الكاميرا" data-testid="cam-reset">⌂</button>
      {st && <span dir="ltr" className="fps">{st.fps.toFixed(0)} FPS</span>}
    </div>
  );
}
