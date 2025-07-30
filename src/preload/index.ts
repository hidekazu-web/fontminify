import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannel, SubsetOptions, FontAnalysis, ProgressState, CompressionStats, Woff2CompressionOptions } from '../shared/types';
import { exposeSecureApi, initializeSecurityMonitoring } from './security';

export interface ElectronAPI {
  selectFiles: () => Promise<string[]>;
  analyzeFont: (filePath: string) => Promise<FontAnalysis>;
  subsetFont: (options: SubsetOptions) => Promise<Buffer>;
  compressWoff2: (fontBuffer: Buffer, options?: Woff2CompressionOptions) => Promise<{ compressedBuffer: Buffer; stats: CompressionStats }>;
  estimateSize: (filePath: string, characterSet: string, enableWoff2Compression?: boolean) => Promise<{ originalSize: number; estimatedSize: number; compressionRatio: number }>;
  saveFile: (data: Buffer, defaultPath: string) => Promise<string | null>;
  saveFileDialog: (defaultPath: string, outputFormat: string) => Promise<string | null>;
  validateSavePath: (filePath: string) => Promise<{ isValid: boolean; error?: string }>;
  onProgressUpdate: (callback: (progress: ProgressState) => void) => void;
  removeProgressListener: () => void;
  cancelProcessing: () => Promise<void>;
  onProcessingCancelled: (callback: () => void) => void;
  removeProcessingCancelledListener: () => void;
}

const electronAPI: ElectronAPI = {
  selectFiles: () => ipcRenderer.invoke(IPCChannel.SELECT_FILES),
  analyzeFont: (filePath: string) => ipcRenderer.invoke(IPCChannel.ANALYZE_FONT, filePath),
  subsetFont: (options: SubsetOptions) => ipcRenderer.invoke(IPCChannel.SUBSET_FONT, options),
  compressWoff2: (fontBuffer: Buffer, options?: Woff2CompressionOptions) => 
    ipcRenderer.invoke(IPCChannel.COMPRESS_WOFF2, fontBuffer, options),
  estimateSize: (filePath: string, characterSet: string, enableWoff2Compression?: boolean) =>
    ipcRenderer.invoke(IPCChannel.ESTIMATE_SIZE, filePath, characterSet, enableWoff2Compression),
  saveFile: (data: Buffer, defaultPath: string) => 
    ipcRenderer.invoke(IPCChannel.SAVE_FILE, data, defaultPath),
  saveFileDialog: (defaultPath: string, outputFormat: string) =>
    ipcRenderer.invoke(IPCChannel.SAVE_FILE_DIALOG, defaultPath, outputFormat),
  validateSavePath: (filePath: string) =>
    ipcRenderer.invoke(IPCChannel.VALIDATE_SAVE_PATH, filePath),
  onProgressUpdate: (callback: (progress: ProgressState) => void) => {
    ipcRenderer.on(IPCChannel.PROGRESS_UPDATE, (_, progress) => callback(progress));
  },
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners(IPCChannel.PROGRESS_UPDATE);
  },
  cancelProcessing: () => ipcRenderer.invoke(IPCChannel.CANCEL_PROCESSING),
  onProcessingCancelled: (callback: () => void) => {
    ipcRenderer.on(IPCChannel.PROCESSING_CANCELLED, callback);
  },
  removeProcessingCancelledListener: () => {
    ipcRenderer.removeAllListeners(IPCChannel.PROCESSING_CANCELLED);
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    
    // セキュアなAPIの公開
    exposeSecureApi();
    
    // セキュリティ監視の初期化
    initializeSecurityMonitoring();
    
    console.log('Preload script loaded with security features');
  } catch (error) {
    console.error('Error in preload script:', error);
  }
} else {
  (window as any).electronAPI = electronAPI;
}