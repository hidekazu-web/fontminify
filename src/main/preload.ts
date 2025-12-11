import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannel, SubsetOptions, ProgressState, ProcessError, Woff2CompressionOptions } from '../shared/types';

// レンダラープロセスで使用可能なAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // ファイル選択
  selectFiles: () => ipcRenderer.invoke(IPCChannel.SELECT_FILES),

  // フォント解析
  analyzeFont: (filePath: string) => ipcRenderer.invoke(IPCChannel.ANALYZE_FONT, filePath),

  // サブセット化
  subsetFont: (options: SubsetOptions) => ipcRenderer.invoke(IPCChannel.SUBSET_FONT, options),

  // WOFF2圧縮
  compressWoff2: (fontBuffer: Buffer, options?: Woff2CompressionOptions) =>
    ipcRenderer.invoke(IPCChannel.COMPRESS_WOFF2, fontBuffer, options),

  // サイズ推定
  estimateSize: (filePath: string, characterSet: string, enableWoff2Compression?: boolean) =>
    ipcRenderer.invoke(IPCChannel.ESTIMATE_SIZE, filePath, characterSet, enableWoff2Compression),

  // ファイル保存ダイアログ
  showSaveDialog: (defaultPath: string, outputFormat: string) =>
    ipcRenderer.invoke(IPCChannel.SAVE_FILE_DIALOG, defaultPath, outputFormat),

  // パス検証
  validateSavePath: (filePath: string) =>
    ipcRenderer.invoke(IPCChannel.VALIDATE_SAVE_PATH, filePath),

  // ファイル保存
  saveFile: (data: Buffer, defaultPath: string) =>
    ipcRenderer.invoke(IPCChannel.SAVE_FILE, data, defaultPath),

  // 処理キャンセル
  cancelProcessing: () => ipcRenderer.invoke(IPCChannel.CANCEL_PROCESSING),

  // イベントリスナー
  onProgressUpdate: (callback: (progress: ProgressState) => void) => {
    ipcRenderer.on(IPCChannel.PROGRESS_UPDATE, (_event, progress) => callback(progress));
  },

  onError: (callback: (error: ProcessError) => void) => {
    ipcRenderer.on(IPCChannel.ERROR, (_event, error) => callback(error));
  },

  onProcessingCancelled: (callback: () => void) => {
    ipcRenderer.on(IPCChannel.PROCESSING_CANCELLED, () => callback());
  },

  // リスナー削除
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners(IPCChannel.PROGRESS_UPDATE);
    ipcRenderer.removeAllListeners(IPCChannel.ERROR);
    ipcRenderer.removeAllListeners(IPCChannel.PROCESSING_CANCELLED);
  }
});