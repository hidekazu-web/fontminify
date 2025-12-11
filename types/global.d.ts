declare global {
  interface Window {
    electronAPI: {
      getPathForFile: (file: File) => string;
      selectFiles: () => Promise<string[]>;
      analyzeFont: (filePath: string) => Promise<any>;
      subsetFont: (options: any) => Promise<any>;
      compressWoff2: (fontBuffer: Buffer, options?: any) => Promise<any>;
      estimateSize: (filePath: string, characterSet: string, enableWoff2Compression?: boolean) => Promise<any>;
      saveFileDialog: (defaultPath: string, outputFormat: string) => Promise<string | null>;
      validateSavePath: (filePath: string) => Promise<any>;
      saveFile: (data: Buffer, defaultPath: string) => Promise<string | null>;
      cancelProcessing: () => Promise<void>;
      onProgressUpdate: (callback: (progress: any) => void) => void;
      onError: (callback: (error: any) => void) => void;
      onProcessingCancelled: (callback: () => void) => void;
      removeProgressListener: () => void;
      removeProcessingCancelledListener: () => void;
    };
    securityAPI: {
      sanitizeFileName: (filename: string) => string;
      validateFilePath: (filePath: string) => boolean;
      logEvent: (event: string, details?: any) => void;
    };
    /** File picker API for Web */
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle[]>;
  }

  /** Electron拡張: File オブジェクトにpath プロパティを追加 */
  interface File {
    /** Electronで追加されるファイルパス */
    readonly path?: string;
  }
}

export {};