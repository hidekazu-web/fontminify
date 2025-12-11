import type {
  FontAnalysis,
  SubsetOptions,
  ProgressState,
  CompressionStats,
  Woff2CompressionOptions,
  ProcessError
} from '../types';

interface SizeEstimation {
  originalSize: number;
  estimatedSize: number;
  compressionRatio: number;
}

interface PathValidation {
  isValid: boolean;
  error?: string;
}

interface CompressWoff2Result {
  compressedBuffer: Buffer;
  stats: CompressionStats;
}

declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<string[]>;
      analyzeFont: (filePath: string) => Promise<FontAnalysis>;
      subsetFont: (options: SubsetOptions) => Promise<Buffer>;
      compressWoff2: (fontBuffer: Buffer, options?: Woff2CompressionOptions) => Promise<CompressWoff2Result>;
      estimateSize: (filePath: string, characterSet: string, enableWoff2Compression?: boolean) => Promise<SizeEstimation>;
      showSaveDialog: (defaultPath: string, outputFormat: string) => Promise<string | null>;
      validateSavePath: (filePath: string) => Promise<PathValidation>;
      saveFile: (data: Buffer, defaultPath: string) => Promise<string | null>;
      cancelProcessing: () => Promise<void>;
      onProgressUpdate: (callback: (progress: ProgressState) => void) => void;
      onError: (callback: (error: ProcessError) => void) => void;
      onProcessingCancelled: (callback: () => void) => void;
      removeAllListeners: () => void;
    };
    securityAPI: {
      sanitizeFileName: (filename: string) => string;
      validateFilePath: (filePath: string) => boolean;
      logEvent: (event: string, details?: Record<string, unknown>) => void;
    };
  }
}

export {};