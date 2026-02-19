import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message || String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[QuranChecker] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#065f46,#0d9488)',
          color: 'white',
          fontFamily: 'Inter,sans-serif',
          padding: '2rem',
          textAlign: 'center',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '4rem' }}>🕌</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Quran Recitation Checker</h1>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 16,
            padding: '1.5rem',
            maxWidth: 480,
            width: '100%',
          }}>
            <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
              ⚠️ Something went wrong loading the app
            </p>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              {this.state.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'white',
                color: '#065f46',
                border: 'none',
                borderRadius: 999,
                padding: '0.6rem 2rem',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              🔄 Reload Page
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '1rem' }}>
            Make sure you're using <strong>Chrome</strong> or <strong>Edge</strong> browser.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
