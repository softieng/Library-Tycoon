import { Component, type ReactNode } from 'react';

/** Keeps a UI crash from taking down the page; the save in local storage is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('UI error', error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal" role="alert">
        <h1>حدث خطأ غير متوقع في الواجهة</h1>
        <p>تقدّمك محفوظ محلياً. أعد تحميل الصفحة للمتابعة.</p>
        <pre dir="ltr">{String(this.state.error.message).slice(0, 300)}</pre>
        <button onClick={() => location.reload()}>إعادة التحميل</button>
      </div>
    );
  }
}
