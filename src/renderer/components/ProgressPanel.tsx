import React from 'react';
import { useFontStore } from '../stores/fontStore';
import ProgressBar from './ProgressBar';
import { formatFileSize, getPhaseLabel, formatTime } from '../../shared/utils';

const ProgressPanel: React.FC = () => {
  const { progressState, processingJobs, cancelProcessing, isProcessing } = useFontStore();

  if (!isProcessing && processingJobs.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              フォント処理中
            </h2>
            
            {isProcessing && (
              <button
                onClick={cancelProcessing}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>

          {/* 全体の進捗 */}
          {progressState && (
            <div className="mb-6">
              <ProgressBar
                progress={progressState}
                onCancel={isProcessing ? cancelProcessing : undefined}
              />
            </div>
          )}

          {/* 個別ファイルの進捗 */}
          {processingJobs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                処理状況
              </h3>
              
              {processingJobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 rounded-lg border ${
                    job.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : job.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : job.status === 'processing'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900 truncate flex-1 mr-3">
                      {job.filePath.split('/').pop()}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {job.status === 'processing' && (
                        <div className="text-xs text-blue-600">
                          {job.progress}%
                        </div>
                      )}
                      
                      <div className={`w-2 h-2 rounded-full ${
                        job.status === 'completed'
                          ? 'bg-green-500'
                          : job.status === 'error'
                          ? 'bg-red-500'
                          : job.status === 'processing'
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                      }`} />
                    </div>
                  </div>

                  {job.status === 'processing' && (
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}

                  {job.status === 'completed' && job.originalSize && job.compressedSize && (
                    <div className="mt-2 text-xs text-green-700">
                      {formatFileSize(job.originalSize)} → {formatFileSize(job.compressedSize)}
                      <span className="ml-2 font-medium">
                        ({(((job.originalSize - job.compressedSize) / job.originalSize) * 100).toFixed(1)}% 削減)
                      </span>
                    </div>
                  )}

                  {job.status === 'error' && job.error && (
                    <div className="mt-2 text-xs text-red-700">
                      エラー: {job.error}
                    </div>
                  )}

                  {job.outputPath && job.status === 'completed' && (
                    <div className="mt-2 text-xs text-gray-500">
                      保存先: {job.outputPath}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 完了メッセージ */}
          {!isProcessing && processingJobs.every(job => job.status === 'completed' || job.status === 'error') && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-green-800">
                    処理が完了しました
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {processingJobs.filter(job => job.status === 'completed').length} / {processingJobs.length} ファイルが正常に処理されました
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressPanel;