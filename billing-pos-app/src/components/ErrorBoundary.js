import React from 'react';
import { logEvent } from '../utils/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, errorInfo) {
    // Persist crash details for diagnostics (never crash due to logging)
    logEvent('error', 'React render error', {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      // ignore
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-xl w-full card p-6">
          <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            The app hit an unexpected error. A crash report was saved to the local Logs.
          </p>
          <p className="mt-4 text-xs font-mono text-gray-500 break-words">
            {this.state.errorMessage}
          </p>

          <div className="mt-6 flex gap-3">
            <button className="btn-primary justify-center" onClick={this.handleReload}>
              Reload App
            </button>
            <button
              className="btn-secondary justify-center"
              onClick={() => {
                // Best-effort: allow user to recover without losing current tab
                this.setState({ hasError: false, errorMessage: '' });
              }}
            >
              Try Continue
            </button>
          </div>
        </div>
      </div>
    );
  }
}

