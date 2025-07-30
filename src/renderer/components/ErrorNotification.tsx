import React, { useState, useEffect } from 'react';
import { AppError, getErrorMessage, isRecoverableError, getErrorSeverity } from '../../shared/errors';

interface ErrorNotificationProps {
  error: AppError;
  onDismiss: () => void;
  onRetry?: () => void;
  autoHide?: boolean;
  duration?: number;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  onRetry,
  autoHide = false,
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const severity = getErrorSeverity(error.type);
  const recoverable = isRecoverableError(error);

  useEffect(() => {
    if (autoHide && severity === 'low') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, severity]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const getSeverityStyles = () => {
    switch (severity) {
      case 'low':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          text: 'text-yellow-700',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
        };
      case 'medium':
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          title: 'text-orange-800',
          text: 'text-orange-700',
          button: 'bg-orange-100 hover:bg-orange-200 text-orange-800',
        };
      case 'high':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          text: 'text-red-700',
          button: 'bg-red-100 hover:bg-red-200 text-red-800',
        };
      case 'critical':
        return {
          container: 'bg-red-100 border-red-300',
          icon: 'text-red-700',
          title: 'text-red-900',
          text: 'text-red-800',
          button: 'bg-red-200 hover:bg-red-300 text-red-900',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-800',
          text: 'text-gray-700',
          button: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
        };
    }
  };

  const styles = getSeverityStyles();

  const getIcon = () => {
    switch (severity) {
      case 'low':
        return (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'medium':
      case 'high':
      case 'critical':
        return (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 max-w-md w-full border rounded-lg shadow-lg transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${styles.container}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {getIcon()}
          </div>
          
          <div className="ml-3 w-0 flex-1">
            <div className={`text-sm font-medium ${styles.title}`}>
              {severity === 'critical' ? '重大なエラー' : 
               severity === 'high' ? 'エラー' :
               severity === 'medium' ? '警告' : '通知'}
            </div>
            
            <div className={`mt-1 text-sm ${styles.text}`}>
              {error.message}
            </div>

            {error.filePath && (
              <div className={`mt-1 text-xs ${styles.text} opacity-75`}>
                ファイル: {error.filePath}
              </div>
            )}

            {(error.details || error.suggestion) && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`mt-2 text-xs underline hover:no-underline ${styles.text}`}
              >
                {isExpanded ? '詳細を隠す' : '詳細を表示'}
              </button>
            )}

            {isExpanded && (
              <div className={`mt-2 text-xs ${styles.text} bg-white bg-opacity-50 p-2 rounded`}>
                {error.details && (
                  <div className="mb-2">
                    <strong>詳細:</strong> {error.details}
                  </div>
                )}
                {error.suggestion && (
                  <div>
                    <strong>解決策:</strong> {error.suggestion}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleDismiss}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {recoverable && onRetry && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={onRetry}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${styles.button}`}
            >
              再試行
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorNotification;