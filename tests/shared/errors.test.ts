import { describe, it, expect } from 'vitest';
import { 
  FontMinifyError, 
  ErrorType, 
  handleError, 
  getErrorSeverity, 
  isRecoverableError 
} from '@shared/errors';

describe('FontMinifyError', () => {
  it('should create error with basic properties', () => {
    const error = new FontMinifyError(
      ErrorType.FILE_NOT_FOUND,
      'ファイルが見つかりません'
    );

    expect(error.type).toBe(ErrorType.FILE_NOT_FOUND);
    expect(error.message).toBe('ファイルが見つかりません');
    expect(error.recoverable).toBe(true);
    expect(error.timestamp).toBeGreaterThan(0);
    expect(error.name).toBe('FontMinifyError');
  });

  it('should create error with all properties', () => {
    const error = new FontMinifyError(
      ErrorType.CORRUPT_FONT,
      'フォントファイルが破損しています',
      {
        recoverable: false,
        filePath: '/path/to/font.ttf',
        suggestion: 'フォントファイルを再ダウンロードしてください'
      }
    );

    expect(error.type).toBe(ErrorType.CORRUPT_FONT);
    expect(error.message).toBe('フォントファイルが破損しています');
    expect(error.recoverable).toBe(false);
    expect(error.filePath).toBe('/path/to/font.ttf');
    expect(error.suggestion).toBe('フォントファイルを再ダウンロードしてください');
  });

  it('should convert to JSON format', () => {
    const error = new FontMinifyError(
      ErrorType.PERMISSION_DENIED,
      'アクセス権限がありません',
      { filePath: '/restricted/font.ttf' }
    );

    const json = error.toJSON();

    expect(json).toEqual({
      type: ErrorType.PERMISSION_DENIED,
      message: 'アクセス権限がありません',
      recoverable: true,
      timestamp: error.timestamp,
      filePath: '/restricted/font.ttf',
      suggestion: undefined
    });
  });

  it('should create from JSON', () => {
    const json = {
      type: ErrorType.SUBSET_FAILED,
      message: 'サブセット化に失敗しました',
      recoverable: true,
      timestamp: Date.now(),
      filePath: '/path/to/font.ttf'
    };

    const error = FontMinifyError.fromJSON(json);

    expect(error.type).toBe(ErrorType.SUBSET_FAILED);
    expect(error.message).toBe('サブセット化に失敗しました');
    expect(error.recoverable).toBe(true);
    expect(error.filePath).toBe('/path/to/font.ttf');
  });
});

describe('handleError', () => {
  it('should handle FontMinifyError', () => {
    const originalError = new FontMinifyError(
      ErrorType.FILE_NOT_FOUND,
      'ファイルが見つかりません'
    );

    const result = handleError(originalError);

    expect(result).toBe(originalError);
  });

  it('should handle regular Error', () => {
    const originalError = new Error('何かエラーが発生しました');
    const result = handleError(originalError, '/path/to/font.ttf');

    expect(result).toBeInstanceOf(FontMinifyError);
    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(result.message).toBe('何かエラーが発生しました');
    expect(result.filePath).toBe('/path/to/font.ttf');
  });

  it('should handle string error', () => {
    const result = handleError('文字列エラー');

    expect(result).toBeInstanceOf(FontMinifyError);
    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(result.message).toBe('文字列エラー');
  });

  it('should handle unknown error types', () => {
    const result = handleError({ unknown: 'object' });

    expect(result).toBeInstanceOf(FontMinifyError);
    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(result.message).toBe('予期しないエラーが発生しました');
  });
});

describe('getErrorSeverity', () => {
  it('should return correct severity for each error type', () => {
    expect(getErrorSeverity(ErrorType.FILE_NOT_FOUND)).toBe('error');
    expect(getErrorSeverity(ErrorType.INVALID_FORMAT)).toBe('error');
    expect(getErrorSeverity(ErrorType.CORRUPT_FONT)).toBe('error');
    expect(getErrorSeverity(ErrorType.INSUFFICIENT_SPACE)).toBe('warning');
    expect(getErrorSeverity(ErrorType.PERMISSION_DENIED)).toBe('error');
    expect(getErrorSeverity(ErrorType.SUBSET_FAILED)).toBe('error');
    expect(getErrorSeverity(ErrorType.COMPRESSION_FAILED)).toBe('warning');
  });
});

describe('isRecoverableError', () => {
  it('should return correct recoverability for each error type', () => {
    expect(isRecoverableError(ErrorType.FILE_NOT_FOUND)).toBe(true);
    expect(isRecoverableError(ErrorType.INVALID_FORMAT)).toBe(true);
    expect(isRecoverableError(ErrorType.CORRUPT_FONT)).toBe(false);
    expect(isRecoverableError(ErrorType.INSUFFICIENT_SPACE)).toBe(true);
    expect(isRecoverableError(ErrorType.PERMISSION_DENIED)).toBe(true);
    expect(isRecoverableError(ErrorType.SUBSET_FAILED)).toBe(true);
    expect(isRecoverableError(ErrorType.COMPRESSION_FAILED)).toBe(true);
  });
});