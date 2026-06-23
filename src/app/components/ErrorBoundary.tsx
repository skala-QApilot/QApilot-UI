import React from 'react';

interface Props { children: React.ReactNode }
interface State { error: Error | null; componentStack: string | null }

/**
 * 앱 전역 ErrorBoundary — 렌더 중 예외가 나도 화면 전체가 흰색(unmount)이 되지 않게 하고,
 * 실제 에러 메시지/스택을 화면에 표시해 원인을 즉시 드러낸다.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 콘솔에도 남겨 개발자 도구에서 추적 가능하게.
    console.error('[ErrorBoundary] 렌더 예외:', error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack ?? null });
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    const box: React.CSSProperties = {
      whiteSpace: 'pre-wrap', fontSize: 12, color: '#475569',
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 12, marginTop: 8, maxHeight: 360, overflow: 'auto',
    };
    return (
      <div style={{ padding: 24, fontFamily: 'ui-monospace, monospace', background: '#fff', minHeight: '100vh' }}>
        <h2 style={{ color: '#dc2626', margin: 0 }}>화면 렌더 중 오류가 발생했습니다</h2>
        <p style={{ color: '#b91c1c', fontWeight: 700, marginTop: 8 }}>
          {String(error.message || error)}
        </p>
        <details open>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>에러 스택</summary>
          <pre style={box}>{error.stack}</pre>
        </details>
        {componentStack && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>컴포넌트 스택</summary>
            <pre style={box}>{componentStack}</pre>
          </details>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer' }}
        >
          새로고침
        </button>
      </div>
    );
  }
}
