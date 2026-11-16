import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      localStorage.removeItem('app_settings');
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-xl border border-red-200 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong loading this section
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            An unexpected error occurred while rendering the page.
          </p>
          {this.state.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-800 text-left mb-6 overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
            >
              🔄 Refresh Page
            </button>
            <button
              onClick={this.handleResetStorage}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg border border-gray-300 transition"
            >
              🧹 Clear Cached Settings & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
