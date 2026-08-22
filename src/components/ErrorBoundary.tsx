import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ORBIT Uncaught Exception Caught by ErrorBoundary]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-stone-200 flex flex-col items-center justify-center p-6 select-none text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <AlertTriangle className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-bold text-stone-100 mb-2">
            Orbit Interface Recovered
          </h2>
          <p className="text-xs text-stone-400 max-w-sm mb-6 leading-relaxed">
            The workspace encountered an unexpected runtime boundary error. The system preserved your active data.
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-white hover:bg-stone-200 text-black font-bold text-xs rounded-full flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

