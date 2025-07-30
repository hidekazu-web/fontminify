import { SUPPORTED_FONT_FORMATS, MAX_FILE_SIZE } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationResult extends ValidationResult {
  file: File | string;
  fileName: string;
  fileSize: number;
  format?: string;
}

export function validateFontFile(file: File | string): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  let fileName: string;
  let fileSize: number;
  let format: string | undefined;

  if (typeof file === 'string') {
    // ファイルパスの場合
    fileName = file.split('/').pop() || file;
    fileSize = 0; // ファイルサイズは後で取得
  } else {
    // Fileオブジェクトの場合
    fileName = file.name;
    fileSize = file.size;
  }

  // ファイル名バリデーション
  if (!fileName) {
    errors.push('ファイル名が無効です');
  }

  // 拡張子バリデーション
  const extension = getFileExtension(fileName).toLowerCase();
  if (!SUPPORTED_FONT_FORMATS.includes(extension as any)) {
    errors.push(`サポートされていないファイル形式です: ${extension}`);
    errors.push(`サポート形式: ${SUPPORTED_FONT_FORMATS.join(', ')}`);
  } else {
    format = extension.replace('.', '');
  }

  // ファイルサイズバリデーション（Fileオブジェクトの場合のみ）
  if (typeof file !== 'string') {
    if (fileSize > MAX_FILE_SIZE) {
      errors.push(`ファイルサイズが大きすぎます: ${formatFileSize(fileSize)} (最大: ${formatFileSize(MAX_FILE_SIZE)})`);
    }
    
    if (fileSize === 0) {
      errors.push('ファイルが空です');
    }
  }

  // ファイル名の文字チェック
  if (hasInvalidCharacters(fileName)) {
    warnings.push('ファイル名に特殊文字が含まれています');
  }

  // フォーマット固有のバリデーション
  if (format) {
    const formatValidation = validateFontFormat(format, fileName);
    errors.push(...formatValidation.errors);
    warnings.push(...formatValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    file,
    fileName,
    fileSize,
    format,
  };
}

export function validateMultipleFiles(files: (File | string)[]): FileValidationResult[] {
  return files.map(file => validateFontFile(file));
}

export function getValidFiles(results: FileValidationResult[]): FileValidationResult[] {
  return results.filter(result => result.isValid);
}

export function getInvalidFiles(results: FileValidationResult[]): FileValidationResult[] {
  return results.filter(result => !result.isValid);
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
}

function hasInvalidCharacters(fileName: string): boolean {
  // Windows/macOSで問題となる可能性のある文字
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  return invalidChars.test(fileName);
}

function validateFontFormat(format: string, fileName: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (format) {
    case 'ttf':
      // TrueTypeフォントの基本チェック
      if (!fileName.toLowerCase().endsWith('.ttf')) {
        errors.push('TTFファイルの拡張子が正しくありません');
      }
      break;
      
    case 'otf':
      // OpenTypeフォントの基本チェック
      if (!fileName.toLowerCase().endsWith('.otf')) {
        errors.push('OTFファイルの拡張子が正しくありません');
      }
      break;
      
    case 'woff':
      // WOFF形式の基本チェック
      if (!fileName.toLowerCase().endsWith('.woff')) {
        errors.push('WOFFファイルの拡張子が正しくありません');
      }
      warnings.push('WOFF形式はブラウザ用です。デスクトップアプリでの使用には適さない場合があります');
      break;
      
    case 'woff2':
      // WOFF2形式の基本チェック
      if (!fileName.toLowerCase().endsWith('.woff2')) {
        errors.push('WOFF2ファイルの拡張子が正しくありません');
      }
      warnings.push('WOFF2形式はブラウザ用です。デスクトップアプリでの使用には適さない場合があります');
      break;
      
    default:
      errors.push(`未知のフォント形式: ${format}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// バッチ処理用のヘルパー関数
export function validateFileList(fileList: FileList | File[] | string[]): {
  valid: FileValidationResult[];
  invalid: FileValidationResult[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
} {
  const files = Array.from(fileList);
  const results = validateMultipleFiles(files);
  const valid = getValidFiles(results);
  const invalid = getInvalidFiles(results);

  return {
    valid,
    invalid,
    totalCount: results.length,
    validCount: valid.length,
    invalidCount: invalid.length,
  };
}

// 追加のヘルパー関数
export function isValidFontFile(fileName: string): boolean {
  const extension = getFileExtension(fileName).toLowerCase();
  return SUPPORTED_FONT_FORMATS.includes(extension as any);
}

// SubsetOptionsのバリデーション
export function validateSubsetOptions(options: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須フィールドの検証
  if (!options.inputPath || options.inputPath.trim() === '') {
    errors.push('入力ファイルパスが必要です');
  }

  // 出力形式の検証
  const validFormats = ['woff2', 'woff', 'ttf', 'otf'];
  if (options.outputFormat && !validFormats.includes(options.outputFormat)) {
    errors.push('無効な出力形式です');
  }

  // 圧縮レベルの検証
  if (options.compressionLevel !== undefined) {
    if (typeof options.compressionLevel !== 'number' || 
        options.compressionLevel < 0 || 
        options.compressionLevel > 10) {
      errors.push('圧縮レベルは0-10の範囲で指定してください');
    }
  }

  // プリセットまたはカスタム文字セットの検証
  if (!options.preset && !options.customCharacters) {
    errors.push('プリセットまたはカスタム文字セットが必要です');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}