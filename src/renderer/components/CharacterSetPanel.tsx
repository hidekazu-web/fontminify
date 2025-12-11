import React from 'react';
import { useFontStore } from '../stores/fontStore';
import { useFontProcessing } from '../hooks/useFontProcessing';
import CharacterSetSelector from './CharacterSetSelector';

const CharacterSetPanel: React.FC = () => {
  const { selectedFiles, subsetOptions, updateSubsetOptions } = useFontStore();
  const {
    selectedPreset,
    customCharacters,
    handleCharacterSetChange,
    handleProcessStart,
  } = useFontProcessing();

  if (selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 p-4 overflow-auto">
      <CharacterSetSelector
        onSelectionChange={handleCharacterSetChange}
        className="mb-4"
      />

      {/* 出力オプション */}
      <OutputOptionsSection
        subsetOptions={subsetOptions}
        updateSubsetOptions={updateSubsetOptions}
      />

      {/* 処理開始ボタン */}
      <ProcessStartSection
        selectedFiles={selectedFiles}
        selectedPreset={selectedPreset}
        customCharacters={customCharacters}
        onProcessStart={handleProcessStart}
      />
    </div>
  );
};

/**
 * 出力オプションセクション
 */
interface OutputOptionsSectionProps {
  subsetOptions: {
    outputFormat?: string;
    enableWoff2Compression?: boolean;
    compressionLevel?: number;
    removeHinting?: boolean;
    desubroutinize?: boolean;
  };
  updateSubsetOptions: (options: Record<string, unknown>) => void;
}

const OutputOptionsSection: React.FC<OutputOptionsSectionProps> = ({
  subsetOptions,
  updateSubsetOptions,
}) => {
  const outputFormats = [
    { value: 'woff2', label: 'WOFF2', description: '推奨' },
    { value: 'woff', label: 'WOFF', description: '高圧縮' },
    { value: 'ttf', label: 'TTF', description: '標準' },
    { value: 'otf', label: 'OTF', description: 'OpenType' },
  ];

  return (
    <div className="space-y-3 mb-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">出力設定</h3>

      <div className="space-y-3">
        {/* 出力形式選択 */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            出力形式
          </label>
          <div className="grid grid-cols-2 gap-2">
            {outputFormats.map((format) => (
              <label
                key={format.value}
                className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                  subsetOptions.outputFormat === format.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="outputFormat"
                  value={format.value}
                  checked={subsetOptions.outputFormat === format.value}
                  onChange={(e) => updateSubsetOptions({ outputFormat: e.target.value })}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className={`font-medium text-xs ${
                    subsetOptions.outputFormat === format.value
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>{format.label}</div>
                  <div className={`text-xs ${
                    subsetOptions.outputFormat === format.value
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>{format.description}</div>
                </div>
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    subsetOptions.outputFormat === format.value
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {subsetOptions.outputFormat === format.value && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* WOFF2圧縮オプション */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={subsetOptions.enableWoff2Compression}
              onChange={(e) => updateSubsetOptions({ enableWoff2Compression: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                WOFF2圧縮を有効
              </div>
            </div>
          </label>
        </div>

        {/* 圧縮レベル設定 */}
        {subsetOptions.enableWoff2Compression && (
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              圧縮レベル: {subsetOptions.compressionLevel || 6}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={subsetOptions.compressionLevel || 6}
              onChange={(e) => updateSubsetOptions({ compressionLevel: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>速度優先</span>
              <span>圧縮率優先</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 処理開始セクション
 */
interface ProcessStartSectionProps {
  selectedFiles: string[];
  selectedPreset: string | undefined;
  customCharacters: string;
  onProcessStart: () => void;
}

const ProcessStartSection: React.FC<ProcessStartSectionProps> = ({
  selectedFiles,
  selectedPreset,
  customCharacters,
  onProcessStart,
}) => {
  const isDisabled = selectedFiles.length === 0 || (!selectedPreset && !customCharacters);

  return (
    <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onProcessStart}
        disabled={isDisabled}
        className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:cursor-not-allowed"
      >
        サブセット化を開始
      </button>

      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {selectedFiles.length > 0 && (
          <>選択されたファイル: {selectedFiles.length}個</>
        )}
      </div>
    </div>
  );
};

export default CharacterSetPanel;
