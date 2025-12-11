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
  const [selectedPreset, setSelectedPreset] = useState<string>('minimum');
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
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">文字セット選択</h3>
        
        {/* モード選択 */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => handleModeChange('preset')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              selectedMode === 'preset'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 プリセット
          </button>
          <button
            onClick={() => handleModeChange('custom')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              selectedMode === 'custom'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✏️ カスタム
          </button>
        </div>

        {/* プリセット選択 */}
        {selectedMode === 'preset' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              日本語フォント用に最適化されたプリセットから選択してください。
            </p>
            
            <div className="grid gap-3">
              {CHARACTER_PRESETS.map((preset) => {
                const info = getPresetInfo(preset);
                const isSelected = selectedPreset === preset.id;
                
                return (
                  <div
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                          <div>
                            <h4 className={`font-medium ${
                              isSelected ? 'text-primary-700' : 'text-gray-900'
                            }`}>
                              {preset.label || preset.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {preset.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className={`text-lg font-semibold ${
                          isSelected ? 'text-primary-600' : 'text-gray-700'
                        }`}>
                          {(preset.estimatedSize || preset.characterCount).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">文字</div>
                        <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                          info.estimatedSize === '小' ? 'bg-green-100 text-green-700' :
                          info.estimatedSize === '中' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {info.estimatedSize}サイズ
                        </div>
                      </div>
                    </div>

                    {/* カテゴリー表示 */}
                    <div className="mt-3 flex flex-wrap gap-1">
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
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
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
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              サブセットに含めたい文字を直接指定できます。テキストファイルからの読み込みも可能です。
            </p>
            
            <CustomCharacterInput
              onCharacterSetChange={handleCustomCharacterChange}
            />
          </div>
        )}
      </div>

      {/* 選択中の情報表示 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">選択中の文字セット</h4>
        {selectedMode === 'preset' ? (
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-gray-600">プリセット: </span>
              <span className="font-medium text-gray-900">
                {CHARACTER_PRESETS.find(p => p.id === selectedPreset)?.label || CHARACTER_PRESETS.find(p => p.id === selectedPreset)?.name}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">文字数: </span>
              <span className="font-medium text-primary-600">
                {(CHARACTER_PRESETS.find(p => p.id === selectedPreset)?.estimatedSize || CHARACTER_PRESETS.find(p => p.id === selectedPreset)?.characterCount || 0).toLocaleString()}文字
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-gray-600">カスタム文字セット</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">文字数: </span>
              <span className="font-medium text-primary-600">
                {customCharacters.length.toLocaleString()}文字
              </span>
            </div>
            {customCharacters.length === 0 && (
              <div className="text-xs text-orange-600">
                文字が入力されていません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSetSelector;