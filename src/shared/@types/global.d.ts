declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<string[]>;
      analyzeFont: (filePath: string) => Promise<any>;
      subsetFont: (options: any) => Promise<any>;
      compressWoff2: (fontBuffer: Buffer, options?: any) => Promise<any>;
      estimateSize: (filePath: string, characterSet: string, enableWoff2Compression?: boolean) => Promise<any>;
      showSaveDialog: (defaultPath: string, outputFormat: string) => Promise<string | null>;
      validateSavePath: (filePath: string) => Promise<any>;
      saveFile: (data: Buffer, defaultPath: string) => Promise<string | null>;
      cancelProcessing: () => Promise<void>;
      onProgressUpdate: (callback: (progress: any) => void) => void;
      onError: (callback: (error: any) => void) => void;
      onProcessingCancelled: (callback: () => void) => void;
      removeAllListeners: () => void;
    };
    securityAPI: {
      sanitizeFileName: (filename: string) => string;
      validateFilePath: (filePath: string) => boolean;
      logEvent: (event: string, details?: any) => void;
    };
  }
}

export {};