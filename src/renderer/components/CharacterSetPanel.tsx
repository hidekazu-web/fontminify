import React, { useState } from 'react';
import { useFontStore } from '../stores/fontStore';
import CharacterSetSelector from './CharacterSetSelector';

const CharacterSetPanel: React.FC = () => {
  const { selectedFiles, subsetOptions, updateSubsetOptions, setProcessing, handleAsyncOperation } = useFontStore();
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>('minimum');
  const [customCharacters, setCustomCharacters] = useState<string>('');

  if (selectedFiles.length === 0) {
    return null;
  }

  const handleCharacterSetChange = (preset?: string, custom?: string) => {
    setSelectedPreset(preset);
    setCustomCharacters(custom || '');
    
    updateSubsetOptions({
      preset,
      customCharacters: custom,
    });
  };

  const handleProcessStart = async () => {
    if (selectedFiles.length === 0) return;

    // 処理開始
    setProcessing(true);

    try {
      // 各ファイルを処理
      for (const filePath of selectedFiles) {
        // 出力ファイル名を生成
        const defaultFileName = generateOutputFileName(
          filePath,
          subsetOptions.outputFormat || 'woff2'
        );
        
        let outputPath: string | null = null;
        let result: any = null;
        
        // ElectronAPIが利用可能な場合
        if (window.electronAPI && window.electronAPI.showSaveDialog && window.electronAPI.subsetFont) {
          // 保存先選択ダイアログを表示
          outputPath = await handleAsyncOperation(
            () => window.electronAPI.showSaveDialog(
              defaultFileName,
              subsetOptions.outputFormat || 'woff2'
            ),
            filePath
          );

          if (!outputPath) {
            // ユーザーがキャンセルした場合
            continue;
          }

          // サブセット処理を実行
          result = await handleAsyncOperation(
            () => window.electronAPI.subsetFont({
              inputPath: filePath,
              outputPath,
              preset: subsetOptions.preset,
              customCharacters: subsetOptions.customCharacters,
              outputFormat: subsetOptions.outputFormat,
              enableWoff2Compression: subsetOptions.enableWoff2Compression,
              compressionLevel: subsetOptions.compressionLevel,
              removeHinting: subsetOptions.removeHinting,
              desubroutinize: subsetOptions.desubroutinize,
            }),
            filePath
          );

          if (result) {
            console.log(`Font processing completed: ${outputPath}`);
          }
        } else {
          // Web版：デモ用処理
          console.log('Web版デモモード: ElectronAPIが利用できません');
          
          // デモ用の処理時間（実際の処理をシミュレート）
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // デモ用の結果をダウンロード
          const demoContent = `FontMinify Web版デモ

処理されたファイル: ${filePath}
出力ファイル名: ${defaultFileName}
選択された文字セット: ${subsetOptions.preset || 'カスタム'}
出力形式: ${subsetOptions.outputFormat || 'woff2'}

注意: これはデモ版です。実際のフォント処理にはElectronデスクトップ版をお使いください。
`;
          
          // Blobとしてダウンロード
          const blob = new Blob([demoContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultFileName.replace(/\.(woff2|woff|ttf|otf)$/, '_demo.txt');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          console.log(`デモファイル生成完了: ${defaultFileName}`);
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  // ファイル名生成のヘルパー関数
  const generateOutputFileName = (inputPath: string, format: string): string => {
    const pathParts = inputPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.split('.').slice(0, -1).join('.');
    return `${nameWithoutExt}_subset.${format}`;
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <CharacterSetSelector
        onSelectionChange={handleCharacterSetChange}
        className="mb-6"
      />

      {/* 出力オプション */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900">出力設定</h3>
        
        <div className="space-y-3">
          {/* 出力形式選択 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              出力形式
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'woff2', label: 'WOFF2', description: '最高圧縮率（推奨）' },
                { value: 'woff', label: 'WOFF', description: '高圧縮率' },
                { value: 'ttf', label: 'TTF', description: '標準形式' },
                { value: 'otf', label: 'OTF', description: 'OpenType' },
              ].map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    subsetOptions.outputFormat === format.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="outputFormat"
                    value={format.value}
                    checked={subsetOptions.outputFormat === format.value}
                    onChange={(e) => updateSubsetOptions({ outputFormat: e.target.value as any })}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    subsetOptions.outputFormat === format.value
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
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
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={subsetOptions.enableWoff2Compression}
                onChange={(e) => updateSubsetOptions({ enableWoff2Compression: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">
                  WOFF2圧縮を有効にする
                </div>
                <div className="text-xs text-gray-500">
                  最高の圧縮率を実現（処理時間が増加する場合があります）
                </div>
              </div>
            </label>
          </div>

          {/* 圧縮レベル設定 */}
          {subsetOptions.enableWoff2Compression && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                圧縮レベル: {subsetOptions.compressionLevel || 6}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={subsetOptions.compressionLevel || 6}
                onChange={(e) => updateSubsetOptions({ compressionLevel: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>速度優先</span>
                <span>圧縮率優先</span>
              </div>
            </div>
          )}

          {/* フォント機能保持 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              フォント機能
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={!subsetOptions.removeHinting}
                  onChange={(e) => updateSubsetOptions({ removeHinting: !e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <div>
                  <div className="text-sm text-gray-700">ヒンティング情報を保持</div>
                  <div className="text-xs text-gray-500">小さなサイズでの表示品質を向上</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={!subsetOptions.desubroutinize}
                  onChange={(e) => updateSubsetOptions({ desubroutinize: !e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <div>
                  <div className="text-sm text-gray-700">サブルーチンを保持</div>
                  <div className="text-xs text-gray-500">フォントの内部構造を最適化</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* サイズ予想 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-blue-800 mb-2">予想ファイルサイズ</h4>
        <div className="text-sm text-blue-700">
          <div className="flex justify-between mb-1">
            <span>現在のファイルサイズ:</span>
            <span className="font-medium">計算中...</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>予想サイズ:</span>
            <span className="font-medium">計算中...</span>
          </div>
          <div className="flex justify-between">
            <span>削減率:</span>
            <span className="font-medium text-green-600">計算中...</span>
          </div>
        </div>
      </div>

      {/* 処理開始ボタン */}
      <div className="space-y-3">
        <button
          onClick={handleProcessStart}
          disabled={
            selectedFiles.length === 0 ||
            (!selectedPreset && !customCharacters)
          }
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:cursor-not-allowed"
        >
          サブセット化を開始
        </button>
        
        <div className="text-xs text-gray-500 text-center">
          {selectedFiles.length > 0 && (
            <>選択されたファイル: {selectedFiles.length}個</>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterSetPanel;