import { BALANCE } from '../config/balance';
import { directorGoals } from './daily';
import { ACHIEVEMENTS, EVENT_BY_ID, EVENTS } from '../config/events';
import { FLAGS } from '../config/featureFlags';
import { QUEUES, SHELVES, ZONES } from '../config/layout';
import { ROLE_BY_ID, ROLES, SERVICES } from '../config/services';
import { UPGRADE_BY_ID } from '../config/upgrades';
import { mascotBusy, play, react, sendGreet, sendGuide, sendSearch, stepMascot } from '../mascot/brain';
import { DIFFICULT_CASES, LOST_WANTS } from '../missions/definitions';
import { breakDevice, failMission, missionSignal, referenceShelfClick, resolveShelfSearch, startMission, stepMissions } from '../missions/engine';
import { NavGrid } from '../navigation/grid';
import { allMovers, near } from '../navigation/movement';
import { efficiencyOf, makeStaff, salaryOf, stepStaff, trainCostOf } from '../staff/staff';
import { countServed, dismiss, emote, pursueNeed, sendToShelf, spawnVisitor, stepVisitor, type QueueId } from '../visitors/visitors';
import type { Ctx } from './ctx';
import { clamp, pick, rand, randRange } from './rng';
import { emptyLedger } from './state';
import type { Action, DayReport, DeviceId, GameState, SimEvent } from './types';

const QUEUE_IDS: QueueId[] = ['borrow', 'print', 'research'];

/**
 * The deterministic simulation. It owns no rendering and no storage: the same state,
 * the same actions and the same number of steps always produce the same result.
 */
export class Simulation {
  nav!: NavGrid;
  private owned = new Set<string>();
  private acc = 0;
  private secondAcc = 0;

  constructor(public state: GameState) { this.rebuildNav(); }

  setState(s: GameState) { this.state = s; this.rebuildNav(); }
  private rebuildNav() { this.owned = new Set(this.state.upgrades); this.nav = new NavGrid(this.owned); }

  private ctx(out: SimEvent[]): Ctx {
    const s = this.state;
    const ctx: Ctx = {
      s, nav: this.nav, out, owned: this.owned,
      signal: (event, n) => missionSignal(ctx, event, n),
      toast: (text, tone = 'info') => { out.push({ type: 'toast', text, tone }); s.log.unshift({ t: s.clock, day: s.day, text, tone }); if (s.log.length > 40) s.log.length = 40; },
      earn: (amount, x, z) => { s.money += amount; s.ledger.income += amount; s.totals.earned += amount; out.push({ type: 'money', amount, x, z }); },
      spend: (amount) => { if (s.money < amount) return false; s.money -= amount; s.ledger.expenses += amount; out.push({ type: 'money', amount: -amount }); return true; },
    };
    return ctx;
  }

  /** Advance real time; internally runs fixed 0.1 s steps. */
  advance(seconds: number): SimEvent[] {
    const out: SimEvent[] = [];
    this.acc += Math.min(seconds, 1.5);
    while (this.acc >= BALANCE.simStep) { this.acc -= BALANCE.simStep; this.step(out); }
    return out;
  }

  /** One fixed step (public for deterministic tests). */
  step(out: SimEvent[] = []): SimEvent[] {
    const dt = BALANCE.simStep, s = this.state, ctx = this.ctx(out);
    s.playTime += dt;
    const timedMission = s.missions.active?.timeLeft != null;

    // ---- Day cycle ----
    if (s.phase === 'open') {
      if (!(timedMission && s.clock >= BALANCE.dayLength - 1)) s.clock += dt;
      if (s.clock >= BALANCE.dayLength) { s.phase = 'closing'; ctx.toast('انتهى الدوام. المكتبة تغلق أبوابها', 'info'); for (const v of s.visitors) if (v.state === 'sit') v.timer = Math.min(v.timer, 3); }
      else this.arrivals(ctx, dt);
    } else {
      s.clock += dt;
      if (!s.visitors.length || s.clock >= BALANCE.dayLength + BALANCE.closingGrace) this.endDay(ctx);
    }

    // ---- Agents ----
    const movers = allMovers(ctx);
    for (const v of s.visitors) stepVisitor(ctx, v, dt, movers);
    for (const st of s.staff) stepStaff(ctx, st, dt, movers);
    stepMascot(ctx, dt, movers, {
      onSearchDone: (shelfId) => resolveShelfSearch(ctx, shelfId),
      onGuideDone: (vid, dest) => this.guideArrived(ctx, vid, dest),
    });
    if (s.visitors.some((v) => v.state === 'gone')) s.visitors = s.visitors.filter((v) => v.state !== 'gone');
    for (const v of s.visitors) if (v.state === 'enter' && v.pathI === 0 && v.z < -9.6 && !v.welcomed && !mascotBusy(s.mascot) && rand(s) < 0.02) sendGreet(ctx);

    this.services(ctx, dt);
    stepMissions(ctx, dt);
    this.randomEvents(ctx, dt);

    // ---- Slow stats ----
    const targetClean = clamp(100 - s.dirt.length * BALANCE.dirtPenalty, 0, 100);
    s.cleanliness += clamp(targetClean - s.cleanliness, -1.2 * dt, 2.2 * dt);
    s.reputation = Math.round(clamp(1 + s.satisfaction * 0.034 + s.cleanliness * 0.006 + s.prestige * 0.02, 1, 5) * 10) / 10;
    this.secondAcc += dt;
    if (this.secondAcc >= 1) { this.secondAcc = 0; this.achievements(ctx); }
    return out;
  }

  private maxVisitors() {
    let n: number = BALANCE.maxVisitorsBase;
    for (const u of ['reading_hall', 'group_reading', 'ecatalog_lab']) if (this.owned.has(u)) n += 2;
    return n;
  }
  private arrivals(ctx: Ctx, dt: number) {
    const s = ctx.s;
    s.arrivalT -= dt;
    if (s.rush && s.playTime > s.rush.until) s.rush = null;
    if (s.arrivalT > 0) return;
    const tod = 0.6 + 0.8 * Math.sin((Math.PI * s.clock) / BALANCE.dayLength);
    const rep = 0.55 + (s.reputation / 5) * 0.8;
    const mult = tod * rep * (s.rush?.mult ?? 1) * (this.owned.has('reception_refresh') ? 1.15 : 1);
    s.arrivalT = (BALANCE.arrivalInterval / mult) * randRange(s, 0.7, 1.3);
    if (s.visitors.length < this.maxVisitors() + (s.rush ? 4 : 0)) spawnVisitor(ctx);
  }

  private services(ctx: Ctx, dt: number) {
    const s = ctx.s;
    for (const q of QUEUE_IDS) {
      const def = SERVICES[q], staff = s.staff.find((x) => x.role === def.role), slot = s.service[q];
      if (slot) {
        const v = s.visitors.find((x) => x.id === slot.visitorId);
        if (!v) { s.service[q] = null; if (staff?.state === 'serving') staff.state = 'working'; continue; }
        const speed = slot.by === 'staff' && staff ? efficiencyOf(staff) : 1 / BALANCE.manualServePenalty;
        slot.t += dt * speed;
        if (slot.t < slot.dur) continue;
        // ---- service complete ----
        s.service[q] = null;
        const i = s.queues[q].indexOf(v.id); if (i >= 0) s.queues[q].splice(i, 1);
        v.queue = null; v.slot = -1;
        ctx.earn(def.reward, v.x, v.z);
        s.ledger.byService[q]++;
        v.carrying = true; v.gesture = 'receive'; v.gestureT = 1.1; emote(v, 'happy', 2.2);
        v.score = clamp(94 - v.waited * 1.1, 45, 96);
        countServed(ctx, v);
        ctx.out.push({ type: 'sfx', name: 'coin' });
        if (staff && slot.by === 'staff') { staff.state = 'working'; staff.servedToday++; staff.servedTotal++; staff.xp++; staff.energy = clamp(staff.energy - 7, 0, 100); staff.serviceTime = staff.serviceTime * 0.8 + (def.duration / efficiencyOf(staff)) * 0.2; }
        if (q === 'research') { const sh = pick(s, SHELVES); if (!sendToShelf(ctx, v, sh.id)) dismiss(ctx, v, 'happy'); else v.need = 'research'; }
        else dismiss(ctx, v, 'happy');
        continue;
      }
      const headId = s.queues[q][0]; if (headId === undefined) continue;
      const v = s.visitors.find((x) => x.id === headId);
      if (!v) { s.queues[q].shift(); continue; }
      if (v.state !== 'queue' || !near(v, QUEUES[q][0], 0.25)) continue;
      if (v.difficult) { if (!v.emote) emote(v, 'request', 999); continue; }
      if (staff && staff.state === 'working') {
        staff.state = 'serving'; v.state = 'served';
        s.service[q] = { visitorId: v.id, t: 0, dur: def.duration, by: 'staff' };
      } else if (!staff && !v.emote) emote(v, 'request', 3);
    }
  }

  private guideArrived(ctx: Ctx, visitorId: number, dest: string) {
    const v = ctx.s.visitors.find((x) => x.id === visitorId); if (!v) return;
    v.emote = null; emote(v, 'happy', 2.5); v.lostWant = null; v.score = 95;
    v.need = dest === 'borrowing' ? 'borrow' : dest === 'reference' ? (this.owned.has('shelves_khwarizmi') ? 'research' : 'borrow') : dest === 'computers' ? 'computer' : 'read';
    v.state = 'enter'; v.timer = 1.2; v.path = null;
    ctx.signal('visitor_guided');
  }

  private randomEvents(ctx: Ctx, dt: number) {
    const s = ctx.s;
    if (s.event) {
      s.event.t -= dt;
      if (s.event.t <= 0) this.resolveEvent(ctx, EVENT_BY_ID[s.event.id].defaultOption, true);
      return;
    }
    if (s.phase !== 'open' || s.playTime < s.nextEventAt) return;
    s.nextEventAt = s.playTime + randRange(s, BALANCE.eventIntervalMin, BALANCE.eventIntervalMax);
    if (rand(s) < 0.3 && !s.broken.length && !s.missions.active) {
      const dev: DeviceId = this.owned.has('print_office') && rand(s) < 0.5 ? 'printer' : pick(s, ['pc_1', 'pc_2', 'pc_3', 'pc_4'] as const);
      breakDevice(ctx, dev);
      ctx.toast(dev === 'printer' ? 'تعطّلت الطابعة! انقر عليها لإصلاحها' : 'حاسبة توقفت عن العمل! انقر عليها لإصلاحها', 'bad');
      return;
    }
    const ev = EVENTS[s.eventsSeen % EVENTS.length];
    s.eventsSeen++;
    s.event = { id: ev.id, t: BALANCE.eventTimeout };
    ctx.out.push({ type: 'sfx', name: 'click' });
  }
  private resolveEvent(ctx: Ctx, choice: number, timedOut = false) {
    const s = ctx.s; if (!s.event) return;
    const ev = EVENT_BY_ID[s.event.id], opt = ev.options[choice === 0 ? 0 : 1];
    if (opt.money && opt.money < 0 && !ctx.spend(-opt.money)) { ctx.toast('الرصيد لا يكفي لهذا الخيار', 'bad'); return; }
    s.event = null;
    if (opt.satisfaction) s.satisfaction = clamp(s.satisfaction + opt.satisfaction, 0, 100);
    if (opt.reputation) s.prestige = clamp(s.prestige + opt.reputation, 0, 40);
    if (opt.cleanliness) s.cleanliness = clamp(s.cleanliness + opt.cleanliness, 0, 100);
    if (opt.visitors) for (let i = 0; i < opt.visitors; i++) spawnVisitor(ctx);
    ctx.toast((timedOut ? 'لم تتخذ قراراً: ' : '') + opt.resultAr, (opt.satisfaction ?? 0) < 0 ? 'bad' : 'good');
  }

  private endDay(ctx: Ctx) {
    const s = ctx.s;
    let salaries = 0;
    for (const st of s.staff) {
      const pay = salaryOf(st);
      if (s.money >= pay) { s.money -= pay; salaries += pay; } else { st.morale = clamp(st.morale - 18, 0, 100); ctx.toast(`لم يُصرف راتب ${st.name} كاملاً. المعنويات انخفضت`, 'bad'); }
      st.servedToday = 0;
    }
    s.ledger.expenses += salaries;
    if (this.owned.has('golden_library')) ctx.earn(150_000);
    const report: DayReport = { day: s.day, income: s.ledger.income, expenses: s.ledger.expenses, salaries, served: s.ledger.served, arrivals: s.ledger.arrivals, lost: s.ledger.lost, satisfaction: Math.round(s.satisfaction), cleanliness: Math.round(s.cleanliness), reputation: s.reputation };
    s.reports.unshift(report); if (s.reports.length > 30) s.reports.length = 30;
    for (const v of s.visitors) { delete s.seats[v.seatId ?? '']; }
    s.visitors = []; s.queues = { borrow: [], print: [], research: [] }; s.service = { borrow: null, print: null, research: null };
    s.seats = {}; s.shelfUsers = {};
    for (const st of s.staff) if (st.state === 'serving') st.state = 'working';
    s.day++; s.clock = 0; s.phase = 'open'; s.ledger = emptyLedger(); s.arrivalT = 2;
    ctx.out.push({ type: 'dayEnd', report });
    ctx.toast(`انتهى اليوم ${report.day}: صافي ${(report.income - report.expenses).toLocaleString('ar-IQ')} د.ع`, report.income >= report.expenses ? 'good' : 'bad');
  }

  private achievements(ctx: Ctx) {
    const s = ctx.s;
    for (const a of ACHIEVEMENTS) if (!s.achievements.includes(a.id) && a.test(s)) {
      s.achievements.push(a.id);
      ctx.out.push({ type: 'achievement', id: a.id }, { type: 'sfx', name: 'good' });
      ctx.toast(`إنجاز جديد: ${a.titleAr}`, 'good');
    }
  }

  /* ---------------------------------------------------------------- player actions */
  dispatch(a: Action): SimEvent[] {
    const out: SimEvent[] = [], ctx = this.ctx(out), s = this.state;
    switch (a.type) {
      case 'buyUpgrade': {
        const u = UPGRADE_BY_ID[a.id];
        if (!u || s.upgrades.includes(u.id)) break;
        if (u.flag && !FLAGS[u.flag]) { ctx.toast('هذه التوسعة قيد التطوير وستتاح في تحديث قادم', 'info'); break; }
        if (u.requires?.some((r) => !s.upgrades.includes(r))) { ctx.toast('أكمل الترقيات المطلوبة أولاً', 'info'); break; }
        if (!ctx.spend(u.cost)) { ctx.toast('الرصيد لا يكفي لهذه الترقية', 'bad'); break; }
        s.upgrades.push(u.id); this.rebuildNav();
        if (u.id === 'reception_refresh') s.prestige = clamp(s.prestige + 5, 0, 40);
        s.satisfaction = clamp(s.satisfaction + 2, 0, 100);
        // Agents re-plan on the changed floor plan.
        for (const v of s.visitors) if (v.path) v.slot = -1;
        react(s.mascot, 'celebrate');
        out.push({ type: 'upgrade', id: u.id }, { type: 'layout' }, { type: 'sfx', name: 'fanfare' });
        ctx.toast(`تمت الترقية: ${u.nameAr}`, 'good');
        break;
      }
      case 'hire': {
        const role = ROLE_BY_ID[a.role];
        if (!role || s.staff.some((x) => x.role === a.role)) break;
        if (!ctx.spend(role.hireCost)) { ctx.toast('الرصيد لا يكفي للتعيين', 'bad'); break; }
        s.staff.push(makeStaff(s, a.role));
        out.push({ type: 'sfx', name: 'good' });
        ctx.toast(`تم تعيين ${role.nameAr}`, 'good');
        break;
      }
      case 'train': {
        const st = s.staff.find((x) => x.id === a.staffId);
        if (!st || st.level >= BALANCE.maxStaffLevel) break;
        if (!ctx.spend(trainCostOf(st))) { ctx.toast('الرصيد لا يكفي للتدريب', 'bad'); break; }
        st.level++; st.morale = clamp(st.morale + 8, 0, 100); st.emote = { kind: 'happy', t: 2.5 };
        out.push({ type: 'sfx', name: 'good' });
        ctx.toast(`${st.name} أكمل دورة تدريبية (المستوى ${st.level})`, 'good');
        break;
      }
      case 'serve': {
        const q = a.service, staff = s.staff.find((x) => x.role === SERVICES[q].role);
        if (s.service[q]) break;
        const v = s.visitors.find((x) => x.id === s.queues[q][0]);
        if (!v || v.state !== 'queue' || !near(v, QUEUES[q][0], 0.25)) { ctx.toast('لا يوجد طالب عند المكتب حالياً', 'info'); break; }
        if (v.difficult) { ctx.toast('هذا الطالب عنده طلب خاص. انقر عليه', 'info'); break; }
        if (staff && staff.state !== 'break') break; // the employee handles it
        v.state = 'served'; v.emote = null;
        s.service[q] = { visitorId: v.id, t: 0, dur: SERVICES[q].duration, by: 'director' };
        out.push({ type: 'sfx', name: 'click' });
        break;
      }
      case 'cleanDirt': {
        const d = s.dirt.find((x) => x.id === a.id); if (!d) break;
        if (!ctx.spend(BALANCE.urgentCleanCost)) { ctx.toast('الرصيد لا يكفي للتنظيف العاجل', 'bad'); break; }
        s.dirt.splice(s.dirt.indexOf(d), 1); s.totals.cleaned++;
        ctx.signal('dirt_cleaned'); out.push({ type: 'sfx', name: 'good' });
        break;
      }
      case 'clickShelf': {
        const run = s.missions.active;
        if (run?.id === 'missing_book') {
          if (String(run.data.searched).split(',').includes(a.id)) { ctx.toast('فتّشنا هذا الرف من قبل', 'info'); break; }
          if (!sendSearch(ctx, a.id)) ctx.toast('الحارس الصغير مشغول، انتظر لحظة', 'info');
          else out.push({ type: 'sfx', name: 'click' });
        } else if (run?.id === 'find_reference') {
          if (referenceShelfClick(ctx, a.id)) {
            const v = s.visitors.find((x) => x.id === run.data.visitor);
            if (v) { v.emote = null; v.lostWant = null; v.score = 96; sendToShelf(ctx, v, a.id); }
          }
        }
        break;
      }
      case 'clickVisitor': {
        const v = s.visitors.find((x) => x.id === a.id); if (!v) break;
        if (v.vip && !v.welcomed) {
          v.welcomed = true; v.emote = null; emote(v, 'happy', 2.5); v.score = Math.max(v.score, 90); v.patience += 12;
          react(s.mascot, 'welcome'); ctx.signal('vip_welcomed'); out.push({ type: 'sfx', name: 'good' });
          ctx.toast('أهلاً وسهلاً بضيوف المكتبة المركزية', 'good');
        } else if (v.state === 'lost' && v.lostWant !== null && v.lostWant !== 'ref' && !v.path) s.missions.dialog = { kind: 'guide', visitorId: v.id };
        else if (v.difficult && v.state === 'queue' && s.queues.borrow[0] === v.id) s.missions.dialog = { kind: 'difficult', visitorId: v.id, scenario: Number(s.missions.active?.data.scenario ?? 0) };
        break;
      }
      case 'guideChoice': {
        const dlg = s.missions.dialog; if (dlg?.kind !== 'guide') break;
        const v = s.visitors.find((x) => x.id === dlg.visitorId); if (!v || v.lostWant === null) { s.missions.dialog = null; break; }
        const want = LOST_WANTS[Number(v.lostWant)];
        if (a.zone !== want.zone) { s.satisfaction = clamp(s.satisfaction - 1, 0, 100); ctx.toast(`«${ZONES.find((z) => z.id === a.zone)?.nameAr}» مو المكان المناسب لطلبه. اقرأ طلبه مرة ثانية`, 'bad'); break; }
        if (!sendGuide(ctx, v.id, a.zone)) { ctx.toast('الحارس الصغير مشغول، انتظر لحظة', 'info'); break; }
        s.missions.dialog = null; v.state = 'follow'; v.emote = null; v.timer = 0;
        ctx.toast('الحارس الصغير يرافق الطالب إلى وجهته', 'good');
        break;
      }
      case 'dialogChoice': {
        const dlg = s.missions.dialog; if (dlg?.kind !== 'difficult') break;
        const v = s.visitors.find((x) => x.id === dlg.visitorId), c = DIFFICULT_CASES[dlg.scenario ?? 0];
        s.missions.dialog = null; if (!v) break;
        v.difficult = false; v.emote = null;
        if (a.choice === c.correct) { v.score = 96; ctx.signal('difficult_resolved'); react(s.mascot, 'point'); ctx.toast('قرار سليم وفق تعليمات المكتبة', 'good'); }
        else { s.satisfaction = clamp(s.satisfaction - 2, 0, 100); dismiss(ctx, v, 'unhappy'); failMission(ctx, 'قرار غير مناسب'); }
        break;
      }
      case 'clickDevice': {
        if (s.broken.includes(a.id)) s.missions.dialog = { kind: 'repair', device: a.id };
        break;
      }
      case 'repairChoice': {
        const dlg = s.missions.dialog; if (dlg?.kind !== 'repair' || !dlg.device) break;
        const dev = dlg.device, clerk = s.staff.find((x) => x.role === 'digital');
        let fixed = false;
        if (a.choice === 'technician') { if (!ctx.spend(BALANCE.technicianCost)) { ctx.toast('الرصيد لا يكفي لأجور الفني', 'bad'); break; } fixed = true; }
        else fixed = rand(s) < 0.45 + (clerk ? 0.15 + 0.07 * clerk.level : 0);
        s.missions.dialog = null;
        if (!fixed) { s.satisfaction = clamp(s.satisfaction - 1, 0, 100); ctx.toast('المحاولة ما نفعت. جرّب مرة ثانية أو اطلب الفني', 'bad'); out.push({ type: 'sfx', name: 'bad' }); break; }
        s.broken = s.broken.filter((x) => x !== dev); s.totals.repaired++;
        ctx.signal(dev === 'printer' ? 'printer_repaired' : 'computer_repaired');
        out.push({ type: 'layout' }, { type: 'sfx', name: 'good' });
        ctx.toast(dev === 'printer' ? 'الطابعة رجعت تشتغل' : 'الحاسبة رجعت للخدمة', 'good');
        break;
      }
      case 'clickMisplaced': {
        const i = s.missions.misplaced.findIndex((x) => x.id === a.id);
        if (i >= 0) { s.missions.misplaced.splice(i, 1); ctx.signal('book_reshelved'); out.push({ type: 'sfx', name: 'click' }); }
        break;
      }
      case 'closeDialog': s.missions.dialog = null; break;
      case 'startMission': startMission(ctx, a.id); break;
      case 'abandonMission': if (s.missions.active) failMission(ctx, 'ألغيت المهمة'); break;
      case 'deweyResult': {
        const correct = clamp(Math.floor(a.correct), 0, 6);
        s.totals.deweyBest = Math.max(s.totals.deweyBest, correct);
        if (s.missions.active?.id === 'dewey_sort') {
          if (correct >= 5) ctx.signal('dewey_correct', correct);
          else ctx.toast(`${correct} من ٦ فقط. جرّب العربة مرة ثانية`, 'info');
        } else if (correct >= 5) { s.satisfaction = clamp(s.satisfaction + 1, 0, 100); ctx.toast('تصنيف ممتاز! الكتب رجعت لرفوفها', 'good'); }
        break;
      }
      case 'claimDirectorGoal': {
        const goal = directorGoals(s).find(g => g.id === a.id);
        if (!goal || !goal.complete || goal.claimed) {
          ctx.toast('هذا التحدي غير مكتمل أو سبق استلام مكافأته', 'info');
          break;
        }
        // Persist a unique, day-scoped reward token before adding the in-game IQD.
        // The same token survives save/reload; the goal cannot be paid twice.
        s.missions.rewardLog.push(goal.token);
        ctx.earn(goal.reward);
        out.push({ type: 'directorGoal', id: goal.id }, { type: 'sfx', name: 'good' });
        ctx.toast(`تحدي المدير اكتمل: ${goal.titleAr}، مكافأة ${goal.reward.toLocaleString('ar-IQ')} د.ع`, 'good');
        break;
      }
      case 'eventChoice': this.resolveEvent(ctx, a.choice); break;
      case 'mascotReward': {
        const m = s.mascot, now = Math.floor(a.now);
        if (!Number.isFinite(now) || now <= 0) break;
        if (now < m.lastRewardAt) { m.lastRewardAt = now; ctx.toast('تم ضبط مؤقّت هدية الحارس من جديد', 'info'); break; } // clock rolled back: restart the cooldown, pay nothing
        if (now - m.lastRewardAt < BALANCE.mascotCooldownMs) { react(m, 'wave'); ctx.toast('هدية الحارس الصغير غير جاهزة بعد', 'info'); break; }
        m.lastRewardAt = now; m.rewardsClaimed++;
        ctx.earn(BALANCE.mascotReward, m.x, m.z);
        play(m, 'celebrate'); out.push({ type: 'sfx', name: 'coin' });
        ctx.toast('هدية الحارس الصغير: +٢٥٬٠٠٠ د.ع', 'good');
        break;
      }
      case 'nextDay': if (s.phase === 'closing') this.endDay(ctx); break;
    }
    void pursueNeed; void ROLES;
    return out;
  }
}

/** Seconds until the mascot gift is ready (0 = ready). */
export const mascotRewardWait = (s: GameState, now: number) => Math.max(0, BALANCE.mascotCooldownMs - (now - s.mascot.lastRewardAt)) / 1000;
