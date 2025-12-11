export enum IPCChannel {
  SELECT_FILES = 'select-files',
  ANALYZE_FONT = 'analyze-font',
  SUBSET_FONT = 'subset-font',
  COMPRESS_WOFF2 = 'compress-woff2',
  ESTIMATE_SIZE = 'estimate-size',
  SAVE_FILE = 'save-file',
  SAVE_FILE_DIALOG = 'save-file-dialog',
  VALIDATE_SAVE_PATH = 'validate-save-path',
  PROGRESS_UPDATE = 'progress-update',
  CANCEL_PROCESSING = 'cancel-processing',
  PROCESSING_CANCELLED = 'processing-cancelled',
  ERROR = 'error',
}

export interface FontAnalysis {
  fileName: string;
  fileSize: number;
  format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'ttc';
  fontFamily: string;
  fontSubfamily: string;
  version: string;
  glyphCount: number;
  characterRanges: CharacterRange[];
  features: OpenTypeFeature[];
  languages: string[];
  hasColorEmoji: boolean;
  isVariableFont: boolean;
  axes?: VariableAxis[];
}

export interface CharacterRange {
  start: number;
  end: number;
  name: string;
}

export interface OpenTypeFeature {
  tag: string;
  name: string;
  enabled: boolean;
}

export interface VariableAxis {
  tag: string;
  name: string;
  min: number;
  max: number;
  default: number;
}

export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  characterCount: number;
  characters: string;
  categories: CharCategory[];
}

export type CharacterSetPreset = 'hiragana-katakana' | 'ascii' | 'kanji-n5' | 'kanji-n4' | 'kanji-n3' | 'kanji-joyo' | 'custom';

export type CharCategory = 
  | 'hiragana' 
  | 'katakana' 
  | 'ascii' 
  | 'symbols' 
  | 'kanji-basic' 
  | 'kanji-standard' 
  | 'kanji-advanced'
  | 'kanji-complete'
  | 'kanji-jis1';

export interface SubsetOptions {
  inputPath: string;
  outputPath?: string;
  outputFormat?: OutputFormat;
  customCharacters?: string;
  preset?: string;
  enableWoff2Compression?: boolean;
  compressionLevel?: number;
  removeHinting?: boolean;
  desubroutinize?: boolean;
  preserveFeatures?: {
    kerning: boolean;
    ligatures: boolean;
    hinting: boolean;
    verticalMetrics: boolean;
  };
  optimizations?: {
    removeUnusedGlyphs: boolean;
    optimizeCFF: boolean;
    transformGlyf: boolean;
  };
}

export type OutputFormat = 'woff2' | 'woff' | 'ttf' | 'otf';

export interface ProgressState {
  phase: 'idle' | 'analyzing' | 'subsetting' | 'optimizing' | 'compressing' | 'complete';
  progress: number; // 0-100
  currentFile: string;
  totalFiles: number;
  processedFiles: number;
  estimatedTime: number; // seconds
  errors: ProcessError[];
}

export interface ProcessError {
  type: ErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
}

export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  CORRUPT_FONT = 'CORRUPT_FONT',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUBSET_FAILED = 'SUBSET_FAILED',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
}

export interface CompressionStats {
  compressionRatio: number;
  sizeDifference: number;
  percentReduction: number;
  originalSize: number;
  compressedSize: number;
}

export interface Woff2CompressionOptions {
  compressionLevel?: number; // 0-10
  transformGlyf?: boolean;
  removeHinting?: boolean;
  desubroutinize?: boolean;
}