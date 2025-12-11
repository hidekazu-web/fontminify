import React from 'react';
import { ProgressState } from '../../shared/types';
import { getPhaseLabel, formatTime } from '../../shared/utils';

interface ProgressBarProps {
  progress: ProgressState;
  onCancel?: () => void;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  onCancel,
  className = '',
}) => {
  const isProcessing = progress.phase !== 'idle' && progress.phase !== 'complete';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 進行状況の概要 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {getPhaseLabel(progress.phase)}
          </h3>
          {progress.currentFile && (
            <p className="text-sm text-gray-600 mt-1">
              {progress.currentFile}
            </p>
          )}
        </div>
        
        {progress.totalFiles > 1 && (
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {progress.processedFiles} / {progress.totalFiles}
            </div>
            <div className="text-xs text-gray-500">ファイル</div>
          </div>
        )}
      </div>

      {/* プログレスバー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">進捗</span>
          <span className="font-medium text-gray-900">{progress.progress}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progress.phase === 'complete'
                ? 'bg-green-500'
                : progress.errors.length > 0
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }}
          />
        </div>
      </div>

      {/* 推定残り時間 */}
      {isProcessing && progress.estimatedTime > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>推定残り時間</span>
          <span>{formatTime(progress.estimatedTime)}</span>
        </div>
      )}

      {/* エラー表示 */}
      {progress.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            エラーが発生しました ({progress.errors.length}件)
          </h4>
          <div className="space-y-1">
            {progress.errors.slice(0, 3).map((error, index) => (
              <div key={index} className="text-xs text-red-700">
                {error.message}
              </div>
            ))}
            {progress.errors.length > 3 && (
              <div className="text-xs text-red-600">
                他 {progress.errors.length - 3} 件のエラー
              </div>
            )}
          </div>
        </div>
      )}

      {/* キャンセルボタン */}
      {isProcessing && onCancel && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* 完了状態 */}
      {progress.phase === 'complete' && progress.errors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 text-green-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">
                処理が完了しました
              </h4>
              {progress.totalFiles > 1 && (
                <p className="text-xs text-green-700 mt-1">
                  {progress.totalFiles}個のファイルを処理しました
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;