// 文字セットプリセット定義
export const CHARACTER_SETS = {
  hiragana: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  katakana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
  ascii: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>?/',
  
  // JLPT漢字レベル（サンプル）
  kanjiN5: '一二三四五六七八九十百千万円時間日本人年月火水木金土子大小中高学校先生',
  kanjiN4: '一二三四五六七八九十百千万円時間日本人年月火水木金土子大小中高学校先生会社家族友達仕事勉強',
  kanjiN3: '一二三四五六七八九十百千万円時間日本人年月火水木金土子大小中高学校先生会社家族友達仕事勉強教育文化社会経済政治科学技術',
  
  // 常用漢字（一部）
  kanjiJoyo: '一二三四五六七八九十百千万億兆上下左右前後内外東西南北春夏秋冬朝昼夜今明日昨大小高低長短新古好悪美醜強弱多少',
} as const;

export const SUPPORTED_FONT_FORMATS = ['.ttf', '.otf', '.woff', '.woff2'] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const DEFAULT_SUBSET_OPTIONS = {
  enableWoff2Compression: true,
  outputFormat: 'woff2' as const,
  removeHinting: false,
  preserveGlyphOrder: true,
} as const;

export enum IPCChannel {
  // ファイル操作
  SELECT_FILES = 'select-files',
  ANALYZE_FONT = 'analyze-font',
  SUBSET_FONT = 'subset-font',
  SAVE_FILE = 'save-file',
  
  // フォント処理
  PROCESS_FONT = 'process-font',
  CANCEL_PROCESSING = 'cancel-processing',
  
  // プログレス更新
  PROGRESS_UPDATE = 'progress-update',
  
  // アップデート関連
  CHECK_FOR_UPDATES = 'check-for-updates',
  GET_APP_VERSION = 'get-app-version',
  GET_UPDATE_SETTINGS = 'get-update-settings',
  UPDATE_SETTINGS = 'update-settings'
}