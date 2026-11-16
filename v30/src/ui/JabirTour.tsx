import { useState } from 'react';
import { JABIR_MISSIONS, JABIR_SHELVES } from '../config/jabirHall';
import { jabirTargetName } from '../gameplay/jabirTour';
import { num, useGame } from './hooks';
import './jabirTour.css';

/** Interactive 3D trial. No buy/unlock and no effect on the saved campaign. */
export function JabirTourPanel() {
  const c = useGame();
  const [showShelves, setShowShelves] = useState(false);
  const state = c.jabirTour;
  if (!state.active) return null;
  const mission = JABIR_MISSIONS.find(m => m.id === state.mission?.missionId);
  const nextId = mission && state.mission && !state.mission.finished ? mission.sequence[state.mission.nextIndex] : null;
  return (
    <aside className="jabir-tour" aria-label="المعاينة التفاعلية لقاعة جابر بن حيان" data-testid="jabir-tour" dir="rtl">
      <header className="jabir-tour__head">
        <div>
          <strong>🧪 قاعة جابر بن حيان</strong>
          <small>معاينة تفاعلية ثلاثية الأبعاد، غير معتمدة للفتح</small>
        </div>
        <div className="jabir-tour__actions">
          <button type="button" onClick={() => c.updateSettings({ sound: !c.settings.sound })}
            data-testid="jabir-sound-toggle" aria-label={c.settings.sound ? 'كتم مؤثرات اللعبة' : 'تشغيل مؤثرات اللعبة'}
            aria-pressed={c.settings.sound} title={c.settings.sound ? 'كتم الصوت' : 'تشغيل الصوت'}>
            {c.settings.sound ? '🔊' : '🔇'}
          </button>
          <button type="button" onClick={() => c.exitJabirTour()} data-testid="jabir-exit" aria-label="الرجوع إلى قاعة الخوارزمي">✕</button>
        </div>
      </header>
      <p className="jabir-tour__note">اضغط على الرفوف والمكاتب داخل المشهد. المهمات تجريبية ولا تغيّر الرصيد أو الحفظ.</p>
      <div className="jabir-tour__overall" data-testid="jabir-overall-progress" role="status">
        <strong>المهمات المكتملة: {num(state.completedIds.length)} من {num(JABIR_MISSIONS.length)}</strong>
        <progress value={state.completedIds.length} max={JABIR_MISSIONS.length}
          aria-label="تقدم مهمات قاعة جابر" />
      </div>
      <div className="jabir-tour__missions">
        {JABIR_MISSIONS.map(m => (
          <button type="button" key={m.id}
            onClick={() => c.startJabirMission(m.id)}
            className={state.mission?.missionId === m.id ? 'is-active' : ''}
            data-testid={`jabir-mission-${m.id}`}
            aria-pressed={state.mission?.missionId === m.id}>
            {state.completedIds.includes(m.id) ? '✓ ' : '🎯 '}{m.titleAr}
          </button>
        ))}
      </div>
      {mission && state.mission && <section className="jabir-tour__objective" data-testid="jabir-current-mission">
        <strong>{mission.titleAr}</strong>
        <p>{mission.storyAr}</p>
        <small>التقدم: {num(Math.min(state.mission.nextIndex, mission.sequence.length))} / {num(mission.sequence.length)}</small>
        <ol className="jabir-tour__steps" aria-label="مراحل المهمة" data-testid="jabir-mission-steps">
          {mission.sequence.map((id, index) => {
            const done = index < state.mission!.nextIndex;
            const current = index === state.mission!.nextIndex && !state.mission!.finished;
            return <li key={id} className={done ? 'is-done' : current ? 'is-current' : ''} aria-current={current ? 'step' : undefined}>
              <span aria-hidden="true">{done ? '✓' : current ? '◉' : '○'}</span>
              <span>{jabirTargetName(id)}</span>
            </li>;
          })}
        </ol>
        {nextId ? (
          <div className="jabir-tour__next">
            <span>الخطوة التالية: <b>{jabirTargetName(nextId)}</b></span>
            <button type="button" onClick={() => c.world?.focusJabirTarget?.(nextId)} data-testid="jabir-focus-next">⌖ اعرض الموقع بالكاميرا</button>
            <small>لإكمال الخطوة، اضغط على المجسم نفسه داخل القاعة.</small>
          </div>
        ) : <p data-testid="jabir-mission-complete">✓ المهمة اكتملت. اختر مهمة أخرى من القائمة.</p>}
      </section>}
      {state.messageAr && <p className="jabir-tour__message" role="status" data-testid="jabir-tour-message">{state.messageAr}</p>}
      <button className="jabir-tour__toggle" type="button" aria-expanded={showShelves} onClick={() => setShowShelves(!showShelves)}>
        {showShelves ? 'إخفاء دليل الرفوف' : 'عرض دليل رفوف ديوي (٨)'}
      </button>
      {showShelves && <div className="jabir-tour__shelves">
        {JABIR_SHELVES.map(s => <button key={s.id} type="button" onClick={() => c.world?.focusJabirTarget?.(s.id)}
          data-testid={`jabir-directory-${s.code}`} title={s.topicsAr.join('، ')}>
          <b>{s.code}</b> {s.titleAr}
        </button>)}
      </div>}
      <button className="jabir-tour__back" type="button" onClick={() => c.exitJabirTour()}>الرجوع إلى قاعة الخوارزمي</button>
    </aside>
  );
}
