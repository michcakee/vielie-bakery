import { Component, type ReactNode } from 'react';

/** If something breaks, show a way back instead of a blank page. The save is untouched. */
export class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[vietbakeshop] crashed', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="crash-screen" role="alert">
        <h1>Oops! Something went wrong.</h1>
        <p>Your bakery is still saved. Reload to keep playing.</p>
        <button type="button" className="btn btn-go big" onClick={() => location.reload()}>
          Reload
        </button>
        <p className="small muted">{this.state.error.message}</p>
      </main>
    );
  }
}
