import { useMemo, useState } from 'react';
import { BOOKS, DEWEY, type BookCard } from '../config/dewey';
import { Btn } from './widgets';
import { num } from './hooks';

/**
 * Mini-game: sort six returned books into the right Dewey Decimal class.
 * It only reports the score; the mission engine decides what that is worth.
 */
export function DeweyGame({ onDone, onClose }: { onDone: (correct: number, total: number) => void; onClose: () => void }) {
  const round = useMemo(() => {
    const pool = [...BOOKS]; const picked: BookCard[] = [];
    while (picked.length < 6) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return picked.map((b) => {
      const others = DEWEY.filter((d) => d.code !== b.code).sort(() => Math.random() - 0.5).slice(0, 3);
      return { book: b, options: [...others, DEWEY.find((d) => d.code === b.code)!].sort((a, z) => a.code.localeCompare(z.code)) };
    });
  }, []);
  const [i, setI] = useState(0), [correct, setCorrect] = useState(0), [picked, setPicked] = useState<string | null>(null);
  const finished = i >= round.length, cur = round[Math.min(i, round.length - 1)];
  const choose = (code: string) => {
    if (picked) return;
    setPicked(code); const ok = code === cur.book.code; if (ok) setCorrect((c) => c + 1);
    window.setTimeout(() => { setPicked(null); setI((n) => n + 1); if (i + 1 >= round.length) onDone(correct + (ok ? 1 : 0), round.length); }, 850);
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="تصنيف ديوي العشري" data-testid="dewey">
      <div className="modal__card modal__card--wide">
        <header><h2>🔢 عربة الكتب المُرجَعة — تصنيف ديوي العشري</h2><button className="x" onClick={onClose} aria-label="إغلاق">✕</button></header>
        {!finished ? (
          <>
            <p className="note">الكتاب {num(i + 1)} من {num(round.length)} · الإجابات الصحيحة {num(correct)}</p>
            <div className="bookcard"><span>📘</span><b>{cur.book.title}</b></div>
            <p>إلى أي رف يعود هذا الكتاب؟</p>
            <div className="dewey-grid">
              {cur.options.map((d) => {
                const state = picked ? (d.code === cur.book.code ? 'right' : d.code === picked ? 'wrong' : '') : '';
                return <button key={d.code} className={`dewey ${state}`} style={{ borderColor: d.color }} onClick={() => choose(d.code)} data-code={d.code} data-answer={d.code === cur.book.code ? '1' : '0'}><b style={{ background: d.color }}>{d.code}</b><span>{d.nameAr}</span></button>;
              })}
            </div>
          </>
        ) : (
          <div className="result">
            <h3>{correct >= 5 ? '🎉 تصنيف ممتاز!' : 'تحتاج محاولة ثانية'}</h3>
            <p>{num(correct)} إجابات صحيحة من {num(round.length)}. {correct >= 5 ? 'الكتب رجعت إلى رفوفها الصحيحة.' : 'المطلوب ٥ على الأقل.'}</p>
            <Btn kind="gold" onClick={onClose} data-testid="dewey-close">تم</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
