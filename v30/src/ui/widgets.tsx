import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { pct } from './hooks';

export function Btn({ kind = 'ghost', children, ...rest }: { kind?: 'gold' | 'ghost' | 'danger' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn btn--${kind}`} {...rest}>{children}</button>;
}
export function Pill({ tone = 'muted', children }: { tone?: 'good' | 'bad' | 'gold' | 'info' | 'muted'; children: ReactNode }) { return <span className={`pill pill--${tone}`}>{children}</span>; }
export function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="section"><h3>{title}</h3>{children}</section>; }
export function Stat({ icon, label, value, tone }: { icon?: string; label: string; value: string; tone?: 'good' | 'bad' }) {
  return <div className={`stat ${tone ? `stat--${tone}` : ''}`}>{icon && <span className="stat__icon">{icon}</span>}<div><small>{label}</small><b>{value}</b></div></div>;
}
/** Progress bar. `invert` means "full is bad" (e.g. a queue). */
export function Bar({ label, value, text, invert }: { label?: string; value: number; text?: string; invert?: boolean }) {
  const v = Math.max(0, Math.min(100, value)), tone = (invert ? 100 - v : v) >= 70 ? 'good' : (invert ? 100 - v : v) >= 40 ? 'mid' : 'low';
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      {label && <div className="bar__head"><span>{label}</span><b>{text ?? pct(v)}</b></div>}
      <div className="bar__track"><div className={`bar__fill bar__fill--${tone}`} style={{ width: `${v}%` }} /></div>
    </div>
  );
}
