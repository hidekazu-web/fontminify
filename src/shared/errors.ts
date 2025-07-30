export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  CORRUPT_FONT = 'CORRUPT_FONT',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUBSET_FAILED = 'SUBSET_FAILED',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  timestamp: number;
  filePath?: string;
  suggestion?: string;
}

export class FontMinifyError extends Error {
  public readonly type: ErrorType;
  public readonly recoverable: boolean;
  public readonly timestamp: number;
  public readonly filePath?: string;
  public readonly suggestion?: string;
  public readonly cause?: Error;

  constructor(
    type: ErrorType,
    message: string,
    options: {
      recoverable?: boolean;
      filePath?: string;
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'FontMinifyError';
    this.type = type;
    this.recoverable = options.recoverable ?? true;
    this.timestamp = Date.now();
    this.filePath = options.filePath;
    this.suggestion = options.suggestion;

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): AppError {
    return {
      type: this.type,
      message: this.message,
      details: this.cause instanceof Error ? this.cause.message : undefined,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      filePath: this.filePath,
      suggestion: this.suggestion,
    };
  }
}

export function createFileNotFoundError(filePath: string): FontMinifyError {
  return new FontMinifyError(
    ErrorType.FILE_NOT_FOUND,
    `ファイルが見つかりません: ${filePath}`,
    {
      filePath,
      suggestion: 'ファイルパスを確認し、ファイルが存在することを確認してください。',
    }
  );
}

export function createInvalidFormatError(filePath: string, expectedFormats: string[]): FontMinifyError {
  return new FontMinifyError(
    ErrorType.INVALID_FORMAT,
    `サポートされていないファイル形式です: ${filePath}`,
    {
      filePath,
      suggestion: `対応形式: ${expectedFormats.join(', ')}`,
    }
  );
}

export function createCorruptFontError(filePath: string): FontMinifyError {
  return new FontMinifyError(
    ErrorType.CORRUPT_FONT,
    `フォントファイルが破損しています: ${filePath}`,
    {
      filePath,
      recoverable: false,
      suggestion: '別のファイルを選択するか、元のファイルを再取得してください。',
    }
  );
}

export function createInsufficientSpaceError(requiredSpace: number): FontMinifyError {
  return new FontMinifyError(
    ErrorType.INSUFFICIENT_SPACE,
    `ディスク容量が不足しています。${Math.ceil(requiredSpace / 1024 / 1024)}MB必要です。`,
    {
      suggestion: '不要なファイルを削除してディスク容量を確保してください。',
    }
  );
}

export function createPermissionDeniedError(filePath: string): FontMinifyError {
  return new FontMinifyError(
    ErrorType.PERMISSION_DENIED,
    `ファイルへのアクセス権限がありません: ${filePath}`,
    {
      filePath,
      suggestion: 'ファイルの権限を確認するか、管理者権限で実行してください。',
    }
  );
}

export function createSubsetFailedError(filePath: string, cause?: Error): FontMinifyError {
  return new FontMinifyError(
    ErrorType.SUBSET_FAILED,
    `フォントサブセット化に失敗しました: ${filePath}`,
    {
      filePath,
      cause,
      suggestion: '文字セットを確認するか、別の設定を試してください。',
    }
  );
}

export function createCompressionFailedError(filePath: string, cause?: Error): FontMinifyError {
  return new FontMinifyError(
    ErrorType.COMPRESSION_FAILED,
    `フォント圧縮に失敗しました: ${filePath}`,
    {
      filePath,
      cause,
      suggestion: '圧縮レベルを下げるか、別の出力形式を試してください。',
    }
  );
}

export function createValidationFailedError(message: string, filePath?: string): FontMinifyError {
  return new FontMinifyError(
    ErrorType.VALIDATION_FAILED,
    `検証エラー: ${message}`,
    {
      filePath,
      suggestion: '入力内容を確認して修正してください。',
    }
  );
}

export function handleError(error: unknown, filePath?: string): FontMinifyError {
  if (error instanceof FontMinifyError) {
    return error;
  }

  if (error instanceof Error) {
    // Node.js特有のエラーを解析
    if (error.message.includes('ENOENT')) {
      return createFileNotFoundError(filePath || 'unknown');
    }
    
    if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
      return createPermissionDeniedError(filePath || 'unknown');
    }
    
    if (error.message.includes('ENOSPC')) {
      return createInsufficientSpaceError(0);
    }

    // フォント関連のエラー
    if (error.message.includes('Invalid font') || error.message.includes('corrupt')) {
      return createCorruptFontError(filePath || 'unknown');
    }

    if (error.message.includes('subset') || error.message.includes('glyph')) {
      return createSubsetFailedError(filePath || 'unknown', error);
    }

    if (error.message.includes('compression') || error.message.includes('woff2')) {
      return createCompressionFailedError(filePath || 'unknown', error);
    }

    // 一般的なエラー
    return new FontMinifyError(
      ErrorType.UNKNOWN_ERROR,
      error.message,
      {
        cause: error,
        filePath,
        suggestion: 'エラーの詳細を確認し、必要に応じてサポートにお問い合わせください。',
      }
    );
  }

  return new FontMinifyError(
    ErrorType.UNKNOWN_ERROR,
    '不明なエラーが発生しました',
    {
      filePath,
      suggestion: 'アプリケーションを再起動してみてください。',
    }
  );
}

export function getErrorMessage(error: AppError): string {
  const timestamp = new Date(error.timestamp).toLocaleString('ja-JP');
  let message = `[${timestamp}] ${error.message}`;
  
  if (error.filePath) {
    message += `\nファイル: ${error.filePath}`;
  }
  
  if (error.suggestion) {
    message += `\n解決策: ${error.suggestion}`;
  }
  
  return message;
}

export function isRecoverableError(error: AppError): boolean {
  return error.recoverable;
}

export function getErrorSeverity(errorType: ErrorType): 'low' | 'medium' | 'high' | 'critical' {
  switch (errorType) {
    case ErrorType.VALIDATION_FAILED:
      return 'low';
    
    case ErrorType.FILE_NOT_FOUND:
    case ErrorType.INVALID_FORMAT:
      return 'medium';
    
    case ErrorType.PERMISSION_DENIED:
    case ErrorType.INSUFFICIENT_SPACE:
    case ErrorType.SUBSET_FAILED:
    case ErrorType.COMPRESSION_FAILED:
      return 'high';
    
    case ErrorType.CORRUPT_FONT:
    case ErrorType.NETWORK_ERROR:
    case ErrorType.UNKNOWN_ERROR:
      return 'critical';
    
    default:
      return 'medium';
  }
}