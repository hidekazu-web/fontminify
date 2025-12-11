import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPCChannel } from '../shared/types';

console.log('Preload script is running...');
console.log('contextBridge available:', !!contextBridge);
console.log('ipcRenderer available:', !!ipcRenderer);

// レンダラープロセスで使用可能なAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // ファイルパス取得（ドラッグ&ドロップ用）
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // ファイル選択
  selectFiles: () => ipcRenderer.invoke(IPCChannel.SELECT_FILES),
  
  // フォント解析
  analyzeFont: (filePath: string) => ipcRenderer.invoke(IPCChannel.ANALYZE_FONT, filePath),
  
  // サブセット化
  subsetFont: (options: any) => ipcRenderer.invoke(IPCChannel.SUBSET_FONT, options),
  
  // WOFF2圧縮
  compressWoff2: (fontBuffer: Buffer, options?: any) => 
    ipcRenderer.invoke(IPCChannel.COMPRESS_WOFF2, fontBuffer, options),
  
  // サイズ推定
  estimateSize: (filePath: string, characterSet: string, enableWoff2Compression?: boolean) =>
    ipcRenderer.invoke(IPCChannel.ESTIMATE_SIZE, filePath, characterSet, enableWoff2Compression),
  
  // ファイル保存ダイアログ
  saveFileDialog: (defaultPath: string, outputFormat: string) =>
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
  onProgressUpdate: (callback: (progress: any) => void) => {
    ipcRenderer.on(IPCChannel.PROGRESS_UPDATE, (event, progress) => callback(progress));
  },
  
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on(IPCChannel.ERROR, (event, error) => callback(error));
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

console.log('ElectronAPI exposed to main world successfully!');

// デバッグ: electronAPIの詳細情報を保存
try {
  (globalThis as any)._electronAPIDebug = {
    preloadLoaded: true,
    timestamp: Date.now(),
    availableFunctions: [
      'getPathForFile', 'selectFiles', 'analyzeFont', 'subsetFont', 'compressWoff2',
      'estimateSize', 'saveFileDialog', 'validateSavePath', 'saveFile',
      'cancelProcessing', 'onProgressUpdate', 'onError', 'onProcessingCancelled',
      'removeAllListeners'
    ]
  };
  console.log('Debug info stored on globalThis');
} catch (error) {
  console.error('Failed to store debug info:', error);
}