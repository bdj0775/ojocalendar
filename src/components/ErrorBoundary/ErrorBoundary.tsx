import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-xl font-bold text-slate-800">오류가 발생했습니다</h1>
          <p className="text-sm text-slate-500 max-w-sm">{this.state.message || '예기치 못한 오류입니다. 페이지를 새로고침 해주세요.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
