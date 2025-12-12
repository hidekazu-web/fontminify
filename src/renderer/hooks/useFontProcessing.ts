import { useState, useCallback } from 'react';
import { useFontStore } from '../stores/fontStore';
import { SubsetOptions } from '../../shared/types';

interface UseFontProcessingOptions {
  onProcessComplete?: (filePath: string, outputPath: string) => void;
  onProcessError?: (filePath: string, error: string) => void;
}

interface UseFontProcessingReturn {
  isProcessing: boolean;
  selectedPreset: string | undefined;
  customCharacters: string;
  setSelectedPreset: (preset: string | undefined) => void;
  setCustomCharacters: (characters: string) => void;
  handleCharacterSetChange: (preset?: string, custom?: string) => void;
  handleProcessStart: () => Promise<void>;
  generateOutputFileName: (inputPath: string, format: string) => string;
}

/**
 * フォント処理ロジックをカプセル化するカスタムフック
 */
export function useFontProcessing(options: UseFontProcessingOptions = {}): UseFontProcessingReturn {
  const {
    selectedFiles,
    subsetOptions,
    updateSubsetOptions,
    setProcessing,
    executeWithErrorHandling,
  } = useFontStore();

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>('joyo-jis1');
  const [customCharacters, setCustomCharacters] = useState<string>('');

  /**
   * 文字セット変更ハンドラ
   */
  const handleCharacterSetChange = useCallback((preset?: string, custom?: string) => {
    setSelectedPreset(preset);
    setCustomCharacters(custom || '');

    updateSubsetOptions({
      preset,
      customCharacters: custom,
    });
  }, [updateSubsetOptions]);

  /**
   * 出力ファイル名を生成
   */
  const generateOutputFileName = useCallback((inputPath: string, format: string): string => {
    const pathParts = inputPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.split('.').slice(0, -1).join('.');
    return `${nameWithoutExt}_subset.${format}`;
  }, []);

  /**
   * Electron API経由でフォント処理を実行
   */
  const processWithElectronAPI = useCallback(async (
    filePath: string,
    outputPath: string,
    subsetOptions: SubsetOptions
  ): Promise<boolean> => {
    const result = await executeWithErrorHandling(
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
      options.onProcessComplete?.(filePath, outputPath);
      return true;
    }
    return false;
  }, [executeWithErrorHandling, options]);

  /**
   * Web版デモ処理を実行
   */
  const processWithWebDemo = useCallback(async (
    filePath: string,
    defaultFileName: string,
    subsetOptions: SubsetOptions
  ): Promise<void> => {
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
  }, []);

  /**
   * 処理開始ハンドラ
   */
  const handleProcessStart = useCallback(async () => {
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

        // ElectronAPIが利用可能な場合
        if (typeof window.electronAPI?.saveFileDialog === 'function' && typeof window.electronAPI?.subsetFont === 'function') {
          // 保存先選択ダイアログを表示
          const outputPath = await executeWithErrorHandling(
            () => window.electronAPI.saveFileDialog(
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
          await processWithElectronAPI(filePath, outputPath, subsetOptions);
        } else {
          // Web版：デモ用処理
          await processWithWebDemo(filePath, defaultFileName, subsetOptions);
        }
      }
    } finally {
      setProcessing(false);
    }
  }, [
    selectedFiles,
    subsetOptions,
    setProcessing,
    executeWithErrorHandling,
    generateOutputFileName,
    processWithElectronAPI,
    processWithWebDemo,
  ]);

  return {
    isProcessing: useFontStore.getState().isProcessing,
    selectedPreset,
    customCharacters,
    setSelectedPreset,
    setCustomCharacters,
    handleCharacterSetChange,
    handleProcessStart,
    generateOutputFileName,
  };
}
