import React, { useState } from 'react';
import { CHARACTER_PRESETS, PresetDefinition } from '../../shared/presets';
import CustomCharacterInput from './CustomCharacterInput';

interface CharacterSetSelectorProps {
  onSelectionChange: (preset?: string, customCharacters?: string) => void;
  className?: string;
}

const CharacterSetSelector: React.FC<CharacterSetSelectorProps> = ({
  onSelectionChange,
  className = '',
}) => {
  const [selectedMode, setSelectedMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string>('joyo-jis1');
  const [customCharacters, setCustomCharacters] = useState<string>('');

  const handleModeChange = (mode: 'preset' | 'custom') => {
    setSelectedMode(mode);
    if (mode === 'preset') {
      onSelectionChange(selectedPreset, undefined);
    } else {
      onSelectionChange(undefined, customCharacters);
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    if (selectedMode === 'preset') {
      onSelectionChange(presetId, undefined);
    }
  };

  const handleCustomCharacterChange = (characters: string) => {
    setCustomCharacters(characters);
    if (selectedMode === 'custom') {
      onSelectionChange(undefined, characters);
    }
  };

  const getPresetInfo = (preset: PresetDefinition) => {
    const sizeValue = preset.estimatedSize || preset.characterCount;
    const estimatedSize = sizeValue < 500 ? '小' :
                         sizeValue < 1500 ? '中' : '大';

    return {
      ...preset,
      estimatedSize,
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          文字セット選択
        </h3>

        {/* モード選択 */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
          <button
            onClick={() => handleModeChange('preset')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              selectedMode === 'preset'
                ? 'bg-white dark:bg-gray-600 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            プリセット
          </button>
          <button
            onClick={() => handleModeChange('custom')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              selectedMode === 'custom'
                ? 'bg-white dark:bg-gray-600 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            カスタム
          </button>
        </div>

        {/* プリセット選択 */}
        {selectedMode === 'preset' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              日本語フォント用に最適化されたプリセットから選択してください。
            </p>

            <div className="space-y-2">
              {CHARACTER_PRESETS.map((preset) => {
                const info = getPresetInfo(preset);
                const isSelected = selectedPreset === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {isSelected && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className={`font-medium text-sm ${
                              isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {preset.label || preset.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {preset.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-3 flex-shrink-0">
                        <div className={`text-base font-semibold ${
                          isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-200'
                        }`}>
                          {(preset.estimatedSize || preset.characterCount).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">文字</div>
                        <div className={`text-xs px-2 py-0.5 rounded-full mt-1 ${
                          info.estimatedSize === '小' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' :
                          info.estimatedSize === '中' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' :
                          'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                        }`}>
                          {info.estimatedSize}サイズ
                        </div>
                      </div>
                    </div>

                    {/* カテゴリー表示 */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {preset.categories.map((category) => {
                        const categoryLabels: Record<string, string> = {
                          'hiragana': 'ひらがな',
                          'katakana': 'カタカナ',
                          'ascii': '英数字',
                          'symbols': '記号',
                          'kanji-basic': '基本漢字',
                          'kanji-standard': '常用漢字',
                          'kanji-jis1': 'JIS第1水準',
                        };

                        return (
                          <span
                            key={category}
                            className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded"
                          >
                            {categoryLabels[category] || category}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* カスタム文字セット入力 */}
        {selectedMode === 'custom' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              サブセットに含めたい文字を直接指定できます。
            </p>

            <CustomCharacterInput
              onCharacterSetChange={handleCustomCharacterChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSetSelector;
