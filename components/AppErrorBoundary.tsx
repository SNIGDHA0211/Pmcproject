import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
          <p className="text-lg font-bold">Something went wrong</p>
          <p className="max-w-md text-sm text-white/70">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.assign('/#/dashboard')}
            className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
          >
            Reload application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
