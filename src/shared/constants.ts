// 文字セット定義（新しいcharsetsモジュールから読み込み）
import {
  HIRAGANA,
  KATAKANA,
  ASCII,
  FULLWIDTH_ALPHANUMERIC,
  JAPANESE_SYMBOLS,
  JOYO_KANJI,
  JIS1_KANJI,
} from './charsets';

// 文字セットプリセット定義
export const CHARACTER_SETS = {
  // 基本文字
  hiragana: HIRAGANA,
  katakana: KATAKANA,
  ascii: ASCII,

  // 全角
  fullwidthAlphanumeric: FULLWIDTH_ALPHANUMERIC,
  japaneseSymbols: JAPANESE_SYMBOLS,

  // 漢字
  joyoKanji: JOYO_KANJI,
  jis1Kanji: JIS1_KANJI,
} as const;

export const SUPPORTED_FONT_FORMATS = ['.ttf', '.otf', '.woff', '.woff2'] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const DEFAULT_SUBSET_OPTIONS = {
  enableWoff2Compression: true,
  outputFormat: 'woff2' as const,
  removeHinting: false,
  preserveGlyphOrder: true,
} as const;

/**
 * IPC通信チャンネル定義
 * アプリケーション内でのIPC通信に使用するチャンネル名を一元管理
 */
export enum IPCChannel {
  // ファイル操作
  SELECT_FILES = 'select-files',
  ANALYZE_FONT = 'analyze-font',
  SUBSET_FONT = 'subset-font',
  SAVE_FILE = 'save-file',
  SAVE_FILE_DIALOG = 'save-file-dialog',
  VALIDATE_SAVE_PATH = 'validate-save-path',

  // フォント処理
  PROCESS_FONT = 'process-font',
  COMPRESS_WOFF2 = 'compress-woff2',
  ESTIMATE_SIZE = 'estimate-size',

  // 処理制御
  CANCEL_PROCESSING = 'cancel-processing',
  PROCESSING_CANCELLED = 'processing-cancelled',

  // プログレス・エラー
  PROGRESS_UPDATE = 'progress-update',
  ERROR = 'error',

  // アップデート関連
  CHECK_FOR_UPDATES = 'check-for-updates',
  GET_APP_VERSION = 'get-app-version',
  GET_UPDATE_SETTINGS = 'get-update-settings',
  UPDATE_SETTINGS = 'update-settings',
}