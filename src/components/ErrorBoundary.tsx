import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';

interface State {
  error: Error | null;
}

/** Last line of defence: an unexpected error shows a way back instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        title="Something went wrong"
        description="Reload the page to try again. Videos you added need to be added again."
        actions={<Button label="Reload" variant="primary" onClick={() => window.location.reload()} />}
      />
    );
  }
}
