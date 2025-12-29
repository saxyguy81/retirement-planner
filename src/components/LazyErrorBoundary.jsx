import React from 'react';
import { RefreshCw } from 'lucide-react';

export class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-950">
          <div className="text-center p-6 bg-slate-900 rounded-lg border border-slate-700 max-w-sm">
            <div className="text-rose-400 text-lg mb-2">Failed to load component</div>
            <p className="text-slate-400 text-sm mb-4">
              There was a problem loading this section. This might be due to a network issue.
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2 mx-auto hover:bg-blue-500"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
