import React, { Component, ReactNode } from 'react';
import { AppError, ErrorType, FontMinifyError } from '../../shared/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const fontMinifyError = new FontMinifyError(
      ErrorType.UNKNOWN_ERROR,
      'アプリケーションで予期しないエラーが発生しました',
      {
        cause: error,
        recoverable: true,
        suggestion: 'ページをリロードするか、アプリケーションを再起動してください。',
      }
    );

    return {
      hasError: true,
      error: fontMinifyError.toJSON(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // エラー報告サービスにエラーを送信する場合はここに実装
    // this.reportError(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-8 h-8 text-red-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-medium text-gray-900">
                  アプリケーションエラー
                </h1>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                {this.state.error.message}
              </p>
              
              {this.state.error.suggestion && (
                <p className="text-sm text-gray-600">
                  <strong>解決策:</strong> {this.state.error.suggestion}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={this.resetError}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                再試行
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
              >
                リロード
              </button>
            </div>

            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                技術的な詳細
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800">
                <div className="mb-2">
                  <strong>エラータイプ:</strong> {this.state.error.type}
                </div>
                <div className="mb-2">
                  <strong>タイムスタンプ:</strong>{' '}
                  {new Date(this.state.error.timestamp).toLocaleString('ja-JP')}
                </div>
                {this.state.error.details && (
                  <div className="mb-2">
                    <strong>詳細:</strong> {this.state.error.details}
                  </div>
                )}
                {this.state.error.filePath && (
                  <div>
                    <strong>ファイル:</strong> {this.state.error.filePath}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;