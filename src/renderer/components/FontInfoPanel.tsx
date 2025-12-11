import React from 'react';
import { useFontStore } from '../stores/fontStore';
import { formatFileSize } from '../../shared/utils';

const FontInfoPanel: React.FC = () => {
  const { selectedFiles, fontAnalyses } = useFontStore();

  if (selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 overflow-auto max-h-[40%]">
      <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">
        フォント情報
      </h3>
      <div className="space-y-3">
        {selectedFiles.map((filePath) => {
          const analysis = fontAnalyses[filePath];

          return (
            <div
              key={filePath}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate mr-2">
                  {analysis?.fileName || filePath.split('/').pop()}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {analysis?.fileSize ? formatFileSize(analysis.fileSize) : ''}
                </span>
              </div>

              {analysis && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">フォントファミリー:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{analysis.fontFamily}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">フォーマット:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{analysis.format.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">グリフ数:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{analysis.glyphCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">可変フォント:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{analysis.isVariableFont ? 'はい' : 'いいえ'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FontInfoPanel;
