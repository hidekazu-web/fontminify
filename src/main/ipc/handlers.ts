import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPCChannel, SubsetOptions, FontAnalysis, CompressionStats } from '../../shared/types';
import { analyzeFont } from '../services/fontAnalyzer';
import { subsetFont, compressToWoff2, calculateCompressionStats, estimateSubsetSize } from '../services/fontSubsetter';
import { saveFileToPath, validateSavePath, generateOutputFileName } from '../services/fileManager';
import { initializeUpdateHandlers } from './updateHandlers';

// キャンセル状態を管理
let isCancelled = false;

export function setupIPC(): void {
  // アップデート関連IPCハンドラーを初期化
  initializeUpdateHandlers();
  // ファイル選択ダイアログ
  ipcMain.handle(IPCChannel.SELECT_FILES, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'フォントファイル',
          extensions: ['ttf', 'otf', 'woff', 'woff2'],
        },
      ],
    });

    return result.canceled ? [] : result.filePaths;
  });

  // フォント解析
  ipcMain.handle(IPCChannel.ANALYZE_FONT, async (event, filePath: string) => {
    try {
      console.log('Analyzing font:', filePath);
      const analysis = await analyzeFont(filePath);
      console.log('Analysis result:', analysis);
      return analysis;
    } catch (error) {
      console.error('Font analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Font analysis failed: ${errorMessage}`);
    }
  });

  // フォントサブセット化
  ipcMain.handle(IPCChannel.SUBSET_FONT, async (event, options: SubsetOptions) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await subsetFont(options, (progress) => {
        window?.webContents.send(IPCChannel.PROGRESS_UPDATE, progress);
      });
      return result;
    } catch (error) {
      console.error('Font subsetting error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.webContents.send(IPCChannel.ERROR, {
        type: 'SUBSET_ERROR',
        message: errorMessage,
        details: options,
      });
      throw error;
    }
  });

  // WOFF2圧縮
  ipcMain.handle(
    IPCChannel.COMPRESS_WOFF2,
    async (event, fontBuffer: Buffer, options: { compressionLevel?: number; transformGlyf?: boolean; removeHinting?: boolean; desubroutinize?: boolean } = {}) => {
      try {
        const compressedBuffer = await compressToWoff2(fontBuffer, options);
        const stats = calculateCompressionStats(fontBuffer.length, compressedBuffer.length);
        
        return {
          compressedBuffer,
          stats: {
            ...stats,
            originalSize: fontBuffer.length,
            compressedSize: compressedBuffer.length,
          } as CompressionStats,
        };
      } catch (error) {
        console.error('WOFF2 compression error:', error);
        throw error;
      }
    }
  );

  // サイズ推定
  ipcMain.handle(
    IPCChannel.ESTIMATE_SIZE,
    async (event, filePath: string, characterSet: string, enableWoff2Compression: boolean = true) => {
      try {
        const estimation = await estimateSubsetSize(filePath, characterSet, enableWoff2Compression);
        return estimation;
      } catch (error) {
        console.error('Size estimation error:', error);
        throw error;
      }
    }
  );

  // ファイル保存ダイアログ
  ipcMain.handle(
    IPCChannel.SAVE_FILE_DIALOG,
    async (event, defaultPath: string, outputFormat: string) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showSaveDialog(window!, {
          defaultPath,
          filters: [
            {
              name: 'フォントファイル',
              extensions: ['ttf', 'otf', 'woff', 'woff2'],
            },
            {
              name: `${outputFormat.toUpperCase()}ファイル`,
              extensions: [outputFormat],
            },
          ],
        });

        if (result.canceled || !result.filePath) {
          return null;
        }

        // パスの妥当性を検証
        const validation = validateSavePath(result.filePath);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        return result.filePath;
      } catch (error) {
        console.error('Save dialog error:', error);
        throw error;
      }
    }
  );

  // パス検証
  ipcMain.handle(
    IPCChannel.VALIDATE_SAVE_PATH,
    async (event, filePath: string) => {
      try {
        return validateSavePath(filePath);
      } catch (error) {
        console.error('Path validation error:', error);
        return { isValid: false, error: `検証エラー: ${error}` };
      }
    }
  );

  // ファイル保存
  ipcMain.handle(
    IPCChannel.SAVE_FILE,
    async (event, data: Buffer, defaultPath: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(window!, {
        defaultPath,
        filters: [
          {
            name: 'フォントファイル',
            extensions: ['ttf', 'otf', 'woff', 'woff2'],
          },
        ],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      try {
        await saveFileToPath(result.filePath, data);
        return result.filePath;
      } catch (error) {
        console.error('File save error:', error);
        throw error;
      }
    }
  );

  // 処理キャンセル
  ipcMain.handle(IPCChannel.CANCEL_PROCESSING, async (event) => {
    isCancelled = true;
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.webContents.send(IPCChannel.PROCESSING_CANCELLED);
    console.log('Processing cancelled by user');
  });
}

// キャンセル状態を確認するためのヘルパー関数
export function getIsCancelled(): boolean {
  return isCancelled;
}

// キャンセル状態をリセットするためのヘルパー関数
export function resetCancelled(): void {
  isCancelled = false;
}