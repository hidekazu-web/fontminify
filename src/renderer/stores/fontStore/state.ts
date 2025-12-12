import { FontAnalysis, SubsetOptions, ProgressState } from '../../../shared/types';
import { AppError } from '../../../shared/errors';

/**
 * 処理ジョブの型定義
 */
export interface ProcessingJob {
  id: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  outputPath?: string;
  originalSize?: number;
  compressedSize?: number;
}

/**
 * FontStoreの状態型定義
 */
export interface FontStoreState {
  // ファイル・フォント解析状態
  selectedFiles: string[];
  fontAnalyses: Record<string, FontAnalysis>;
  subsetOptions: SubsetOptions;

  // 処理状態
  isProcessing: boolean;
  progressState: ProgressState | null;
  processingJobs: ProcessingJob[];

  // エラー状態
  errors: AppError[];
  hasErrors: boolean;

  // UI状態
  selectedPreset: string;
  customCharacters: string;
  showAdvancedOptions: boolean;
  isDragOver: boolean;
  isDarkMode: boolean;

  // バリアブルフォント状態
  variationAxesValues: Record<string, number>;
  pinVariationAxes: boolean;
}

/**
 * 初期状態を生成
 */
export function createInitialState(isDarkMode: boolean): FontStoreState {
  return {
    // ファイル・フォント解析状態
    selectedFiles: [],
    fontAnalyses: {},
    subsetOptions: {
      inputPath: '',
      outputPath: '',
      preset: 'standard',
      outputFormat: 'woff2',
      enableWoff2Compression: true,
      compressionLevel: 6,
      removeHinting: false,
      desubroutinize: false,
    },

    // 処理状態
    isProcessing: false,
    progressState: null,
    processingJobs: [],

    // エラー状態
    errors: [],
    hasErrors: false,

    // UI状態
    selectedPreset: 'standard',
    customCharacters: '',
    showAdvancedOptions: false,
    isDragOver: false,
    isDarkMode,

    // バリアブルフォント状態
    variationAxesValues: {},
    pinVariationAxes: true,
  };
}
