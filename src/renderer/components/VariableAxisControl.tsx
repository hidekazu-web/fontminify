import React, { useState, useCallback } from 'react';
import { VariableAxis } from '../../shared/types';

interface VariableAxisControlProps {
  axes: VariableAxis[];
  values: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
  pinAxes: boolean;
  onPinAxesChange: (pin: boolean) => void;
  className?: string;
}

// 軸タグの日本語名マッピング
const AXIS_LABELS: Record<string, string> = {
  wght: '太さ (Weight)',
  wdth: '幅 (Width)',
  slnt: '傾き (Slant)',
  ital: 'イタリック (Italic)',
  opsz: '光学サイズ (Optical Size)',
};

// 軸ごとのプリセット値
const AXIS_PRESETS: Record<string, { name: string; value: number }[]> = {
  wght: [
    { name: 'Thin', value: 100 },
    { name: 'Light', value: 300 },
    { name: 'Regular', value: 400 },
    { name: 'Medium', value: 500 },
    { name: 'Bold', value: 700 },
    { name: 'Black', value: 900 },
  ],
};

const VariableAxisControl: React.FC<VariableAxisControlProps> = ({
  axes,
  values,
  onChange,
  pinAxes,
  onPinAxesChange,
  className = '',
}) => {
  const handleSliderChange = useCallback(
    (tag: string, value: number) => {
      onChange({ ...values, [tag]: value });
    },
    [values, onChange]
  );

  const handlePresetClick = useCallback(
    (tag: string, value: number) => {
      onChange({ ...values, [tag]: value });
    },
    [values, onChange]
  );

  const handleResetAll = useCallback(() => {
    const defaultValues: Record<string, number> = {};
    axes.forEach((axis) => {
      defaultValues[axis.tag] = axis.default;
    });
    onChange(defaultValues);
  }, [axes, onChange]);

  const getAxisLabel = (axis: VariableAxis) => {
    return AXIS_LABELS[axis.tag] || `${axis.name} (${axis.tag})`;
  };

  const getPresets = (axis: VariableAxis) => {
    const presets = AXIS_PRESETS[axis.tag];
    if (!presets) return null;
    return presets.filter((p) => p.value >= axis.min && p.value <= axis.max);
  };

  if (axes.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          バリアブルフォント軸設定
        </h3>
        <button
          onClick={handleResetAll}
          className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          デフォルトに戻す
        </button>
      </div>

      {/* 軸スライダー */}
      <div className="space-y-4">
        {axes.map((axis) => {
          const currentValue = values[axis.tag] ?? axis.default;
          const presets = getPresets(axis);

          return (
            <div key={axis.tag} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  {getAxisLabel(axis)}
                </label>
                <span className="text-sm font-mono text-primary-600 dark:text-primary-400">
                  {currentValue}
                </span>
              </div>

              {/* スライダー */}
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                  {axis.min}
                </span>
                <input
                  type="range"
                  min={axis.min}
                  max={axis.max}
                  step={(axis.max - axis.min) / 100}
                  value={currentValue}
                  onChange={(e) => handleSliderChange(axis.tag, Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                  {axis.max}
                </span>
              </div>

              {/* プリセットボタン */}
              {presets && presets.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetClick(axis.tag, preset.value)}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${
                        currentValue === preset.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 軸値固定オプション */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={pinAxes}
            onChange={(e) => onPinAxesChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-primary-500 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              軸値を固定してサイズを削減
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              チェックを入れると、選択した軸値で固定され、バリアブル機能は失われますが、
              ファイルサイズが大幅に削減されます。
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default VariableAxisControl;
