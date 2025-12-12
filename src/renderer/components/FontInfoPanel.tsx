import React, { useEffect } from 'react';
import { useFontStore } from '../stores/fontStore';
import { formatFileSize } from '../../shared/utils';
import VariableAxisControl from './VariableAxisControl';

const FontInfoPanel: React.FC = () => {
  const {
    selectedFiles,
    fontAnalyses,
    removeFile,
    clearFiles,
    variationAxesValues,
    pinVariationAxes,
    setVariationAxesValues,
    setPinVariationAxes,
    resetVariationAxesToDefaults,
  } = useFontStore();

  // バリアブルフォントが読み込まれたときに軸のデフォルト値を設定
  useEffect(() => {
    const firstFile = selectedFiles[0];
    const analysis = firstFile ? fontAnalyses[firstFile] : null;

    if (analysis?.isVariableFont && analysis.axes && analysis.axes.length > 0) {
      // 軸のデフォルト値がまだ設定されていない場合のみ初期化
      const hasValues = Object.keys(variationAxesValues).length > 0;
      if (!hasValues) {
        resetVariationAxesToDefaults(analysis.axes);
      }
    }
  }, [selectedFiles, fontAnalyses, variationAxesValues, resetVariationAxesToDefaults]);

  if (selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 p-4 overflow-auto flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          フォント情報
        </h3>
        <button
          onClick={clearFiles}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          すべて解除
        </button>
      </div>
      <div className="space-y-2 flex-1 overflow-auto">
        {selectedFiles.map((filePath) => {
          const analysis = fontAnalyses[filePath];

          return (
            <div
              key={filePath}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 relative group"
            >
              {/* 削除ボタン */}
              <button
                onClick={() => removeFile(filePath)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-red-500 text-gray-500 dark:text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                title="削除"
              >
                ×
              </button>

              <div className="flex justify-between items-center mb-2 pr-6">
                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                  {analysis?.fileName || filePath.split('/').pop()}
                </span>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {analysis?.fileSize ? formatFileSize(analysis.fileSize) : ''}
              </div>

              {analysis && (
                <div className="text-xs space-y-1 border-t border-gray-200 dark:border-gray-600 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">ファミリー:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium truncate ml-2">{analysis.fontFamily}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">形式:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {analysis.format.toUpperCase()}
                      {analysis.isVariableFont && (
                        <span className="ml-2 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-[10px] font-semibold">
                          Variable
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">グリフ数:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{analysis.glyphCount.toLocaleString()}</span>
                  </div>
                  {analysis.isVariableFont && analysis.axes && analysis.axes.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">軸数:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{analysis.axes.length}</span>
                    </div>
                  )}
                </div>
              )}

              {/* バリアブルフォント軸コントロール */}
              {analysis?.isVariableFont && analysis.axes && analysis.axes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <VariableAxisControl
                    axes={analysis.axes}
                    values={variationAxesValues}
                    onChange={setVariationAxesValues}
                    pinAxes={pinVariationAxes}
                    onPinAxesChange={setPinVariationAxes}
                  />
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
