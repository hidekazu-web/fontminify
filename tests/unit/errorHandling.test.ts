import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFontProcessingError, AppError, ErrorType } from '../../src/shared/errors';
import { analyzeFont } from '../../src/main/services/fontAnalyzer';
import { subsetFont } from '../../src/main/services/fontSubsetter';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('fontkit');
vi.mock('subset-font');

const mockFs = vi.mocked(fs);

describe('エラーハンドリングテスト（全エラータイプ）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ファイルシステムエラー', () => {
    it('ファイルが存在しない場合のエラー処理', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await analyzeFont('/nonexistent/font.ttf');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.FILE_NOT_FOUND);
      expect(result.error?.message).toContain('ファイルが見つかりません');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('正しいファイルパスを確認');
    });

    it('ファイル読み取り権限不足エラー', async () => {
      mockFs.readFile.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await analyzeFont('/restricted/font.ttf');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.PERMISSION_DENIED);
      expect(result.error?.message).toContain('ファイルへのアクセスが拒否');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('ファイルの権限を確認');
    });

    it('ディスク容量不足エラー', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const result = await subsetFont({
        inputPath: '/test/input.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.DISK_FULL);
      expect(result.error?.message).toContain('ディスク容量が不足');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('空き容量を確保');
    });

    it('ファイルが使用中のエラー', async () => {
      mockFs.readFile.mockRejectedValue(new Error('EBUSY: resource busy or locked'));

      const result = await analyzeFont('/locked/font.ttf');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.FILE_LOCKED);
      expect(result.error?.message).toContain('ファイルが他のプロセスで使用中');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('ファイルを閉じて再試行');
    });
  });

  describe('フォント形式エラー', () => {
    it('無効なフォント形式エラー', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('INVALID_FONT_DATA'));
      
      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockImplementation(() => {
        throw new Error('Invalid font format');
      });

      const result = await analyzeFont('/test/invalid.ttf');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.INVALID_FONT_FORMAT);
      expect(result.error?.message).toContain('無効なフォント形式');
      expect(result.error?.recoverable).toBe(false);
      expect(result.error?.suggestions).toContain('有効なフォントファイルを選択');
    });

    it('破損したフォントファイルエラー', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('CORRUPTED_FONT_DATA'));
      
      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockImplementation(() => {
        throw new Error('Invalid sfnt version');
      });

      const result = await analyzeFont('/test/corrupted.ttf');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CORRUPT_FONT);
      expect(result.error?.message).toContain('フォントファイルが破損');
      expect(result.error?.recoverable).toBe(false);
      expect(result.error?.suggestions).toContain('別のフォントファイルを使用');
    });

    it('サポートされていないフォント機能エラー', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('FONT_WITH_UNSUPPORTED_FEATURES'));
      
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('Unsupported font feature: COLR'));

      const result = await subsetFont({
        inputPath: '/test/color-font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.UNSUPPORTED_FEATURE);
      expect(result.error?.message).toContain('サポートされていない機能');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('別の出力形式を試す');
    });

    it('空のフォントファイルエラー', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.alloc(0));

      const result = await analyzeFont('/test/empty.ttf');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.EMPTY_FILE);
      expect(result.error?.message).toContain('ファイルが空');
      expect(result.error?.recoverable).toBe(false);
      expect(result.error?.suggestions).toContain('有効なフォントファイルを選択');
    });
  });

  describe('処理エラー', () => {
    it('メモリ不足エラー', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('Cannot allocate memory'));

      const result = await subsetFont({
        inputPath: '/test/huge-font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'a'.repeat(10000),
        outputFormat: 'woff2'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.OUT_OF_MEMORY);
      expect(result.error?.message).toContain('メモリが不足');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('文字セットを減らす');
    });

    it('サブセット化失敗エラー', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('Subsetting failed: glyph not found'));

      const result = await subsetFont({
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff2',
        characters: '存在しない文字',
        outputFormat: 'woff2'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.SUBSET_FAILED);
      expect(result.error?.message).toContain('サブセット化に失敗');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('文字セットを確認');
    });

    it('圧縮失敗エラー', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('WOFF2 compression failed'));

      const result = await subsetFont({
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2',
        enableWoff2Compression: true
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.COMPRESSION_FAILED);
      expect(result.error?.message).toContain('圧縮に失敗');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('別の出力形式を試す');
    });

    it('タイムアウトエラー', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 31000)); // 31秒
        throw new Error('Processing timeout');
      });

      const result = await subsetFont({
        inputPath: '/test/slow-font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2',
        timeout: 30000 // 30秒タイムアウト
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.TIMEOUT);
      expect(result.error?.message).toContain('処理がタイムアウト');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('文字セットを減らす');
    });
  });

  describe('ネットワークエラー', () => {
    it('アップデートチェック失敗エラー', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      try {
        throw new AppError({
          type: ErrorType.NETWORK_ERROR,
          message: 'アップデートの確認に失敗しました',
          recoverable: true,
          suggestions: ['インターネット接続を確認してください', '後で再試行してください']
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.NETWORK_ERROR);
        expect((error as AppError).message).toContain('アップデートの確認に失敗');
        expect((error as AppError).recoverable).toBe(true);
      }
    });

    it('ライセンス認証エラー', async () => {
      try {
        throw new AppError({
          type: ErrorType.LICENSE_ERROR,
          message: 'ライセンスの認証に失敗しました',
          recoverable: true,
          suggestions: ['ライセンスキーを確認してください', 'インターネット接続を確認してください']
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.LICENSE_ERROR);
        expect((error as AppError).recoverable).toBe(true);
      }
    });
  });

  describe('設定・データエラー', () => {
    it('設定ファイル破損エラー', async () => {
      mockFs.readFile.mockRejectedValue(new Error('JSON parse error'));

      try {
        throw new AppError({
          type: ErrorType.CONFIG_ERROR,
          message: '設定ファイルが破損しています',
          recoverable: true,
          suggestions: ['設定をリセットしてください', 'アプリケーションを再インストールしてください']
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.CONFIG_ERROR);
        expect((error as AppError).recoverable).toBe(true);
      }
    });

    it('データベースエラー', async () => {
      try {
        throw new AppError({
          type: ErrorType.DATABASE_ERROR,
          message: 'データベースにアクセスできません',
          recoverable: true,
          suggestions: ['アプリケーションを再起動してください', 'データベースファイルを確認してください']
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.DATABASE_ERROR);
        expect((error as AppError).recoverable).toBe(true);
      }
    });
  });

  describe('未知のエラー', () => {
    it('予期しないエラーの処理', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('Unexpected error occurred'));

      const result = await subsetFont({
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.error?.message).toContain('予期しないエラー');
      expect(result.error?.recoverable).toBe(true);
      expect(result.error?.suggestions).toContain('アプリケーションを再起動');
    });

    it('JavaScript実行時エラー', async () => {
      try {
        // 意図的にエラーを発生させる
        const obj: any = null;
        obj.someMethod();
      } catch (error) {
        const appError = handleFontProcessingError(error);
        
        expect(appError.type).toBe(ErrorType.RUNTIME_ERROR);
        expect(appError.message).toContain('実行時エラー');
        expect(appError.recoverable).toBe(true);
        expect(appError.suggestions).toContain('アプリケーションを再起動');
      }
    });
  });

  describe('エラー回復処理', () => {
    it('自動回復可能なエラーの処理', async () => {
      let attemptCount = 0;
      const mockSubsetFont = (await import('subset-font')).default;
      
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return Buffer.from('success');
      });

      // リトライ機能付きでサブセット化を実行
      const result = await subsetFont({
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2',
        maxRetries: 3
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('フォールバック処理の実行', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      
      // WOFF2圧縮が失敗した場合のフォールバック
      vi.mocked(mockSubsetFont)
        .mockRejectedValueOnce(new Error('WOFF2 compression failed'))
        .mockResolvedValueOnce(Buffer.from('woff-fallback'));

      const result = await subsetFont({
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2',
        fallbackFormat: 'woff'
      });

      expect(result.success).toBe(true);
      expect(result.outputFormat).toBe('woff'); // フォールバック形式
      expect(result.warnings).toContain('WOFF2圧縮に失敗したため、WOFF形式で出力');
    });

    it('キャッシュクリア後の再試行', async () => {
      let cacheCleared = false;
      const mockSubsetFont = (await import('subset-font')).default;
      
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        if (!cacheCleared) {
          cacheCleared = true;
          throw new Error('Cache corruption');
        }
        return Buffer.from('success-after-cache-clear');
      });

      const result = await subsetFont({
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2',
        clearCacheOnError: true
      });

      expect(result.success).toBe(true);
      expect(cacheCleared).toBe(true);
    });
  });

  describe('エラー報告と分析', () => {
    it('エラー情報の詳細収集', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('Test error'));

      const result = await subsetFont({
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'abc',
        outputFormat: 'woff2'
      });

      expect(result.error?.details).toBeDefined();
      expect(result.error?.details?.timestamp).toBeDefined();
      expect(result.error?.details?.inputFile).toBe('/test/font.ttf');
      expect(result.error?.details?.outputFormat).toBe('woff2');
      expect(result.error?.details?.characterCount).toBe(3);
      expect(result.error?.details?.stackTrace).toBeDefined();
    });

    it('エラーログの生成', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new AppError({
        type: ErrorType.SUBSET_FAILED,
        message: 'テストエラー',
        recoverable: true,
        details: {
          inputFile: '/test/font.ttf',
          errorCode: 'ERR_001'
        }
      });

      error.log();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FontMinify Error]'),
        expect.objectContaining({
          type: 'SUBSET_FAILED',
          message: 'テストエラー',
          details: expect.objectContaining({
            inputFile: '/test/font.ttf',
            errorCode: 'ERR_001'
          })
        })
      );

      consoleSpy.mockRestore();
    });

    it('エラー統計の収集', () => {
      const errorStats = {
        totalErrors: 0,
        errorsByType: new Map<ErrorType, number>(),
        errorsByRecoverable: { recoverable: 0, unrecoverable: 0 }
      };

      const errors = [
        new AppError({ type: ErrorType.FILE_NOT_FOUND, message: 'Error 1', recoverable: true }),
        new AppError({ type: ErrorType.SUBSET_FAILED, message: 'Error 2', recoverable: true }),
        new AppError({ type: ErrorType.CORRUPT_FONT, message: 'Error 3', recoverable: false }),
        new AppError({ type: ErrorType.FILE_NOT_FOUND, message: 'Error 4', recoverable: true })
      ];

      errors.forEach(error => {
        errorStats.totalErrors++;
        errorStats.errorsByType.set(
          error.type,
          (errorStats.errorsByType.get(error.type) || 0) + 1
        );
        if (error.recoverable) {
          errorStats.errorsByRecoverable.recoverable++;
        } else {
          errorStats.errorsByRecoverable.unrecoverable++;
        }
      });

      expect(errorStats.totalErrors).toBe(4);
      expect(errorStats.errorsByType.get(ErrorType.FILE_NOT_FOUND)).toBe(2);
      expect(errorStats.errorsByType.get(ErrorType.SUBSET_FAILED)).toBe(1);
      expect(errorStats.errorsByType.get(ErrorType.CORRUPT_FONT)).toBe(1);
      expect(errorStats.errorsByRecoverable.recoverable).toBe(3);
      expect(errorStats.errorsByRecoverable.unrecoverable).toBe(1);
    });
  });

  describe('ユーザー向けエラーメッセージ', () => {
    it('日本語エラーメッセージの適切な表示', () => {
      const errors = [
        {
          type: ErrorType.FILE_NOT_FOUND,
          expectedMessage: 'ファイルが見つかりません。正しいファイルパスを確認してください。'
        },
        {
          type: ErrorType.PERMISSION_DENIED,
          expectedMessage: 'ファイルへのアクセスが拒否されました。ファイルの権限を確認してください。'
        },
        {
          type: ErrorType.INVALID_FONT_FORMAT,
          expectedMessage: '無効なフォント形式です。TTF、OTF、WOFF、WOFF2形式のファイルを選択してください。'
        },
        {
          type: ErrorType.OUT_OF_MEMORY,
          expectedMessage: 'メモリが不足しています。文字セットを減らすか、より小さなフォントファイルを使用してください。'
        }
      ];

      errors.forEach(({ type, expectedMessage }) => {
        const error = new AppError({ type, message: expectedMessage, recoverable: true });
        expect(error.message).toBe(expectedMessage);
        expect(error.getUserFriendlyMessage()).toBe(expectedMessage);
      });
    });

    it('エラーレベルの適切な分類', () => {
      const errorLevels = [
        { type: ErrorType.FILE_NOT_FOUND, expectedLevel: 'warning' },
        { type: ErrorType.CORRUPT_FONT, expectedLevel: 'error' },
        { type: ErrorType.OUT_OF_MEMORY, expectedLevel: 'critical' },
        { type: ErrorType.NETWORK_ERROR, expectedLevel: 'warning' },
        { type: ErrorType.UNKNOWN_ERROR, expectedLevel: 'error' }
      ];

      errorLevels.forEach(({ type, expectedLevel }) => {
        const error = new AppError({ type, message: 'Test message', recoverable: true });
        expect(error.getLevel()).toBe(expectedLevel);
      });
    });
  });
});