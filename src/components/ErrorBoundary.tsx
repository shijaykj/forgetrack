import { Component, type ReactNode } from 'react';

/** Keeps one broken screen from taking down the whole app; data is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error) {
    console.error('[forgetrack] screen crashed', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page page-narrow">
        <div className="card" style={{ marginTop: 40 }}>
          <div className="empty">
            <h3>This screen hit a snag</h3>
            <p className="muted">Your data is safe — it's stored locally and wasn't changed. Try going back or reloading.</p>
            <p className="faint" style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {this.state.error.message}
            </p>
            <div className="empty-action">
              <button type="button" className="btn btn-primary btn-md" onClick={() => location.assign('/')}>
                Back to Today
              </button>
              <button type="button" className="btn btn-secondary btn-md" onClick={() => location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
