import React, { useEffect, useState } from 'react'
import { AppError, ErrorType, isRecoverableError } from '../../shared/errors'

interface ErrorToastProps {
  error: AppError
  index: number
  onDismiss: (index: number) => void
  onRetry?: () => void
}

export function ErrorToast({ error, index, onDismiss, onRetry }: ErrorToastProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // アニメーション用
  useEffect(() => {
    // マウント時にアニメーション開始
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  // 自動消去（10秒後）- 回復可能なエラーのみ
  useEffect(() => {
    if (isRecoverableError(error.type as ErrorType)) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss(index), 300)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [error.type, index, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(index), 300)
  }

  const getSeverityColor = (type: string) => {
    switch (type) {
      case ErrorType.CORRUPT_FONT:
      case ErrorType.UNKNOWN_ERROR:
        return 'bg-red-50 border-red-300'
      case ErrorType.FILE_NOT_FOUND:
      case ErrorType.INVALID_FORMAT:
      case ErrorType.PERMISSION_DENIED:
        return 'bg-orange-50 border-orange-300'
      default:
        return 'bg-yellow-50 border-yellow-300'
    }
  }

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case ErrorType.CORRUPT_FONT:
      case ErrorType.UNKNOWN_ERROR:
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )
    }
  }

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case ErrorType.FILE_NOT_FOUND:
        return 'ファイルエラー'
      case ErrorType.INVALID_FORMAT:
        return 'フォーマットエラー'
      case ErrorType.CORRUPT_FONT:
        return 'フォント破損'
      case ErrorType.SUBSET_FAILED:
        return 'サブセット化エラー'
      case ErrorType.COMPRESSION_FAILED:
        return '圧縮エラー'
      case ErrorType.VALIDATION_FAILED:
        return '検証エラー'
      case ErrorType.WASM_LOAD_FAILED:
        return 'WASMエラー'
      case ErrorType.WORKER_ERROR:
        return 'Workerエラー'
      case ErrorType.FILE_TOO_LARGE:
        return 'ファイルサイズ超過'
      default:
        return 'エラー'
    }
  }

  return (
    <div
      className={`
        ${getSeverityColor(error.type)}
        border rounded-lg p-4 shadow-lg
        transform transition-all duration-300
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        {getSeverityIcon(error.type)}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">
              {getErrorTypeLabel(error.type)}
            </span>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 ml-2"
              aria-label="閉じる"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-700">{error.message}</p>

          {error.filePath && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              ファイル: {error.filePath}
            </p>
          )}

          {/* 詳細展開ボタン */}
          {(error.details || error.suggestion) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              {isExpanded ? '詳細を隠す' : '詳細を表示'}
            </button>
          )}

          {/* 詳細情報 */}
          {isExpanded && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-1">
              {error.details && (
                <p className="text-gray-600">
                  <span className="font-medium">詳細:</span> {error.details}
                </p>
              )}
              {error.suggestion && (
                <p className="text-gray-600">
                  <span className="font-medium">解決策:</span> {error.suggestion}
                </p>
              )}
            </div>
          )}

          {/* アクションボタン */}
          {error.recoverable && onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ErrorContainerProps {
  errors: AppError[]
  onDismiss: (index: number) => void
  onRetry?: () => void
}

export function ErrorContainer({ errors, onDismiss, onRetry }: ErrorContainerProps) {
  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error, index) => (
        <ErrorToast
          key={`${error.timestamp}-${index}`}
          error={error}
          index={index}
          onDismiss={onDismiss}
          onRetry={error.recoverable ? onRetry : undefined}
        />
      ))}
    </div>
  )
}
