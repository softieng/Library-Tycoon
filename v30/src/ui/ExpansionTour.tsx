import { EXPANSION_BY_ID, expansionTarget } from '../config/expansionHalls';
import { num, useGame } from './hooks';
import './jabirTour.css';

/** Four original interactive, non-economic 3D room previews. */
export function ExpansionTourPanel() {
  const c = useGame();
  const state = c.extraTour;
  if (!state.active) return null;
  const hall = EXPANSION_BY_ID[state.active];
  const quest = hall.quests.find(q => q.id === state.quest?.id);
  const currentId = quest && state.quest && !state.quest.finished
    ? quest.sequence[state.quest.nextIndex] : null;
  const completed = state.progress.completed[hall.id];
  const live = c.liveHall?.snapshot;
  return (
    <aside className="jabir-tour expansion-tour" dir="rtl" data-testid="expansion-tour"
      aria-label={'المعاينة التفاعلية ل' + hall.nameAr}>
      <header className="jabir-tour__head">
        <div>
          <strong>{hall.icon} {hall.nameAr}</strong>
          <small>{hall.taglineAr}</small>
          <small>مشهد تجريبي مع مهمات، وليس فتحاً رسمياً أو محاكاة الخدمات النهائية</small>
        </div>
        <div className="jabir-tour__actions">
          <button type="button" onClick={() => c.updateSettings({ sound: !c.settings.sound })}
            aria-label={c.settings.sound ? 'كتم الصوت' : 'تشغيل الصوت'} title="التحكم بالصوت"
            data-testid="expansion-mute">{c.settings.sound ? '🔊' : '🔇'}</button>
          <button type="button" data-testid="expansion-exit" aria-label="العودة إلى الخوارزمي"
            onClick={() => c.exitExtraHall()}>✕</button>
        </div>
      </header>
      <p className="jabir-tour__note">اختر تحدياً، ثم انقر المجسمات المطلوبة بالترتيب. المصادر والمهمات خيالية خاصة باللعبة، ولا تمثل بيانات فهرس Koha.</p>
      {live && <section className="expansion-live" data-testid="expansion-live-status" aria-label="محاكاة خدمات القاعة">
        <strong>👥 حركة الزوار الحية</strong>
        <div className="expansion-live__metrics">
          <span>داخل القاعة <b>{num(live.visitors.length)}</b></span>
          <span>في الطابور <b>{num(live.queue)}</b></span>
          <span>خدمات أُنجزت <b>{num(live.served)}</b></span>
          <span>غادروا <b>{num(live.departed)}</b></span>
          <span>رضا الزوار <b>{num(live.satisfaction)}%</b></span>
        </div>
        <fieldset className="expansion-live__policy" data-testid="expansion-policy">
          <legend>قرار إداري: سرعة الخدمة</legend>
          {([
            ['careful', 'جودة أعلى'],
            ['balanced', 'متوازنة'],
            ['rapid', 'سريعة'],
          ] as const).map(([policy, label]) =>
            <button type="button" key={policy}
              data-testid={'expansion-policy-' + policy}
              aria-pressed={live.policy === policy}
              disabled={live.policy === policy}
              onClick={() => { c.liveHall?.setServicePolicy(policy); c.notify(); }}>
              {label}
            </button>
          )}
        </fieldset>
        <small>الخدمة الدقيقة ترفع الرضا وتبطئ الطابور. السريعة تقلل الانتظار لكن تؤثر على الرضا. هذا الاختيار تجريبي ومنفصل عن أموال الحملة.</small>
        <small>محاكاة مستقلة، لا تغير رواتب أو رصيد الخوارزمي. الموظف ثابت في موقعه.</small>
      </section>}
      <div className="jabir-tour__overall" role="status" data-testid="expansion-progress">
        <strong>المهمات المكتملة: {num(completed.length)} من {num(hall.quests.length)}</strong>
        <progress max={hall.quests.length} value={completed.length} aria-label="تقدم مهمات القاعة"/>
        <small>نقاط الخبرة: {num(state.progress.earnedXp[hall.id])} XP، مستقلة عن دينار الحملة</small>
      </div>
      <div className="jabir-tour__missions" role="group" aria-label="المهمات القصصية">
        {hall.quests.map(q => <button key={q.id} type="button"
          data-testid={'expansion-quest-' + q.id}
          className={state.quest?.id === q.id ? 'is-active' : ''}
          aria-pressed={state.quest?.id === q.id}
          onClick={() => c.startExtraQuest(q.id)}>
          {completed.includes(q.id) ? '✓ ' : '🎯 '}{q.titleAr} · {num(q.xp)} XP
        </button>)}
      </div>
      {quest && state.quest && <section className="jabir-tour__objective" data-testid="expansion-current-quest">
        <strong>{quest.titleAr}</strong>
        <p>{quest.storyAr}</p>
        <ol className="jabir-tour__steps">
          {quest.sequence.map((targetId, index) => {
            const done = index < state.quest!.nextIndex;
            const current = !state.quest!.finished && index === state.quest!.nextIndex;
            return <li key={targetId} className={done ? 'is-done' : current ? 'is-current' : ''}
              aria-current={current ? 'step' : undefined}>
              <span aria-hidden="true">{done ? '✓' : current ? '◉' : '○'}</span>
              <span>{expansionTarget(hall.id, targetId)?.titleAr ?? targetId}</span>
            </li>;
          })}
        </ol>
        {currentId ? <div className="jabir-tour__next">
          <span>الخطوة التالية: <b>{expansionTarget(hall.id, currentId)?.titleAr}</b></span>
          <button type="button" data-testid="expansion-focus-next"
            onClick={() => c.world?.focusExtraHallTarget?.(hall.id, currentId)}>
            ⌖ إظهار الموقع
          </button>
          <small>يجب النقر على المجسم بنفسك لإكمال الخطوة.</small>
        </div> : <p data-testid="expansion-quest-complete">✓ انتهت المهمة. اختر التحدي التالي.</p>}
      </section>}
      {state.messageAr && <p className="jabir-tour__message" role="status">{state.messageAr}</p>}
      <button className="jabir-tour__back" type="button" onClick={() => c.exitExtraHall()}>
        الرجوع إلى قاعة الخوارزمي
      </button>
    </aside>
  );
}
