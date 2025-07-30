import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveProcessedFont, checkDiskSpace, validateOutputPath } from '../../src/main/services/fileSaver';
import * as fs from 'fs/promises';
import * as path from 'path';
import { dialog } from 'electron';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: vi.fn(),
    showErrorBox: vi.fn(),
    showMessageBox: vi.fn()
  }
}));

const mockFs = vi.mocked(fs);
const mockDialog = vi.mocked(dialog);

describe('ファイル保存テスト（権限エラー、容量不足）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('権限エラーテスト', () => {
    it('書き込み権限がないディレクトリでの保存失敗', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const restrictedPath = '/System/Library/Fonts/restricted.woff2';

      mockFs.writeFile.mockRejectedValue(new Error('EACCES: permission denied, open \'/System/Library/Fonts/restricted.woff2\''));

      const result = await saveProcessedFont(testBuffer, restrictedPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toContain('書き込み権限がありません');
      expect(result.error?.details?.path).toBe(restrictedPath);
      expect(result.error?.suggestions).toContain('管理者権限で実行');
      expect(result.error?.suggestions).toContain('別の場所を選択');
    });

    it('読み取り専用ファイルの上書き失敗', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const readOnlyPath = '/test/readonly.woff2';

      // ファイルが存在し、読み取り専用である場合をシミュレート
      mockFs.access.mockResolvedValue(undefined); // ファイル存在
      mockFs.stat.mockResolvedValue({
        mode: 0o444, // 読み取り専用
        isFile: () => true,
        isDirectory: () => false
      } as any);

      mockFs.writeFile.mockRejectedValue(new Error('EACCES: permission denied, open \'/test/readonly.woff2\''));

      const result = await saveProcessedFont(testBuffer, readOnlyPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_ONLY_FILE');
      expect(result.error?.message).toContain('読み取り専用ファイル');
      expect(result.error?.suggestions).toContain('ファイルの属性を変更');
      expect(result.error?.suggestions).toContain('別のファイル名で保存');
    });

    it('ディレクトリの作成権限不足', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const newDirPath = '/restricted/new_folder/output.woff2';

      mockFs.mkdir.mockRejectedValue(new Error('EACCES: permission denied, mkdir \'/restricted/new_folder\''));

      const result = await saveProcessedFont(testBuffer, newDirPath, { createDirectories: true });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_CREATION_FAILED');
      expect(result.error?.message).toContain('ディレクトリを作成できません');
      expect(result.error?.details?.parentDir).toBe('/restricted');
      expect(result.error?.suggestions).toContain('親ディレクトリの権限を確認');
    });

    it('ネットワークドライブでの権限エラー', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const networkPath = '/Volumes/NetworkDrive/output.woff2';

      mockFs.writeFile.mockRejectedValue(new Error('EACCES: operation not permitted, open \'/Volumes/NetworkDrive/output.woff2\''));

      const result = await saveProcessedFont(testBuffer, networkPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_PERMISSION_DENIED');
      expect(result.error?.message).toContain('ネットワークドライブへの書き込み権限');
      expect(result.error?.suggestions).toContain('ネットワーク接続を確認');
      expect(result.error?.suggestions).toContain('ローカルドライブに保存');
    });

    it('システム保護されたディレクトリでの保存失敗', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const systemPath = '/System/Applications/FontMinify.app/Contents/Resources/output.woff2';

      mockFs.writeFile.mockRejectedValue(new Error('EPERM: operation not permitted, open \'/System/Applications/FontMinify.app/Contents/Resources/output.woff2\''));

      const result = await saveProcessedFont(testBuffer, systemPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_PROTECTED');
      expect(result.error?.message).toContain('システム保護されたディレクトリ');
      expect(result.error?.suggestions).toContain('ユーザーディレクトリを使用');
      expect(result.error?.suggestions).toContain('デスクトップまたはドキュメントフォルダ');
    });
  });

  describe('容量不足エラーテスト', () => {
    it('ディスク容量不足での保存失敗', async () => {
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      const outputPath = '/test/large_output.woff2';

      mockFs.writeFile.mockRejectedValue(new Error('ENOSPC: no space left on device, write'));

      const result = await saveProcessedFont(largeBuffer, outputPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISK_FULL');
      expect(result.error?.message).toContain('ディスク容量が不足');
      expect(result.error?.details?.requiredSpace).toBe(largeBuffer.length);
      expect(result.error?.suggestions).toContain('不要なファイルを削除');
      expect(result.error?.suggestions).toContain('別のドライブを選択');
    });

    it('事前の容量チェック', async () => {
      const outputPath = '/test/output.woff2';
      const requiredSize = 50 * 1024 * 1024; // 50MB

      // 利用可能容量をシミュレート
      mockFs.stat.mockResolvedValue({
        size: 10 * 1024 * 1024, // 10MB しか空きがない
        isFile: () => false,
        isDirectory: () => true
      } as any);

      const spaceCheck = await checkDiskSpace(outputPath, requiredSize);

      expect(spaceCheck.hasEnoughSpace).toBe(false);
      expect(spaceCheck.availableSpace).toBe(10 * 1024 * 1024);
      expect(spaceCheck.requiredSpace).toBe(requiredSize);
      expect(spaceCheck.shortfall).toBe(40 * 1024 * 1024);
    });

    it('一時的な容量不足での自動リトライ', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/output.woff2';

      let attemptCount = 0;
      mockFs.writeFile.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('ENOSPC: no space left on device, write');
        }
        return; // 成功
      });

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        retryOnDiskFull: true,
        maxRetries: 3,
        retryDelay: 100
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(result.warnings).toContain('一時的な容量不足により再試行');
    });

    it('外部ストレージの接続エラー', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const externalPath = '/Volumes/ExternalDrive/output.woff2';

      mockFs.writeFile.mockRejectedValue(new Error('ENOENT: no such file or directory, open \'/Volumes/ExternalDrive/output.woff2\''));

      const result = await saveProcessedFont(testBuffer, externalPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXTERNAL_DRIVE_NOT_FOUND');
      expect(result.error?.message).toContain('外部ドライブが見つかりません');
      expect(result.error?.suggestions).toContain('ドライブが接続されているか確認');
      expect(result.error?.suggestions).toContain('別の保存場所を選択');
    });

    it('クラウドストレージの同期エラー', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const cloudPath = '/Users/test/iCloud Drive (Archive)/output.woff2';

      mockFs.writeFile.mockRejectedValue(new Error('EAGAIN: resource temporarily unavailable, open'));

      const result = await saveProcessedFont(testBuffer, cloudPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CLOUD_SYNC_ERROR');
      expect(result.error?.message).toContain('クラウドストレージの同期エラー');
      expect(result.error?.suggestions).toContain('インターネット接続を確認');
      expect(result.error?.suggestions).toContain('ローカルフォルダに保存');
    });
  });

  describe('ファイルパス検証', () => {
    it('無効な文字を含むファイル名の検証', async () => {
      const invalidPaths = [
        '/test/output:invalid.woff2',    // コロン
        '/test/output<invalid>.woff2',   // 角括弧
        '/test/output|invalid.woff2',    // パイプ
        '/test/output"invalid".woff2',   // ダブルクォート
        '/test/output*invalid*.woff2'    // アスタリスク
      ];

      for (const invalidPath of invalidPaths) {
        const validation = await validateOutputPath(invalidPath);
        
        expect(validation.isValid).toBe(false);
        expect(validation.error?.code).toBe('INVALID_FILENAME');
        expect(validation.error?.message).toContain('無効な文字');
        expect(validation.error?.details?.invalidChars).toBeDefined();
        expect(validation.suggestions).toContain('ファイル名から無効な文字を削除');
      }
    });

    it('長すぎるファイル名の検証', async () => {
      const longFileName = 'a'.repeat(256) + '.woff2';
      const longPath = `/test/${longFileName}`;

      const validation = await validateOutputPath(longPath);

      expect(validation.isValid).toBe(false);
      expect(validation.error?.code).toBe('FILENAME_TOO_LONG');
      expect(validation.error?.message).toContain('ファイル名が長すぎます');
      expect(validation.error?.details?.maxLength).toBe(255);
      expect(validation.error?.details?.currentLength).toBe(longFileName.length);
    });

    it('深すぎるディレクトリパスの検証', async () => {
      const deepPath = '/' + Array(50).fill('verylongdirectoryname').join('/') + '/output.woff2';

      const validation = await validateOutputPath(deepPath);

      expect(validation.isValid).toBe(false);
      expect(validation.error?.code).toBe('PATH_TOO_DEEP');
      expect(validation.error?.message).toContain('パスが深すぎます');
      expect(validation.error?.details?.maxDepth).toBe(32);
      expect(validation.suggestions).toContain('より浅いディレクトリを選択');
    });

    it('予約されたファイル名の検証', async () => {
      const reservedNames = ['CON.woff2', 'PRN.woff2', 'AUX.woff2', 'NUL.woff2'];

      for (const reservedName of reservedNames) {
        const reservedPath = `/test/${reservedName}`;
        const validation = await validateOutputPath(reservedPath);

        expect(validation.isValid).toBe(false);
        expect(validation.error?.code).toBe('RESERVED_FILENAME');
        expect(validation.error?.message).toContain('予約されたファイル名');
        expect(validation.suggestions).toContain('別のファイル名を使用');
      }
    });
  });

  describe('セーフモード保存', () => {
    it('既存ファイルのバックアップ作成', async () => {
      const testBuffer = Buffer.from('NEW_FONT_DATA');
      const outputPath = '/test/existing.woff2';
      const existingData = Buffer.from('EXISTING_FONT_DATA');

      mockFs.access.mockResolvedValue(undefined); // ファイル存在
      mockFs.readFile.mockResolvedValue(existingData);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        createBackup: true 
      });

      expect(result.success).toBe(true);
      expect(result.backupPath).toBe('/test/existing.woff2.backup');
      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/existing.woff2.backup', existingData);
      expect(mockFs.writeFile).toHaveBeenCalledWith(outputPath, testBuffer);
    });

    it('一時ファイル経由での安全な保存', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/output.woff2';
      const tempPath = '/test/output.woff2.tmp';

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        useTempFile: true 
      });

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(tempPath, testBuffer);
      expect(mockFs.rename).toHaveBeenCalledWith(tempPath, outputPath);
    });

    it('一時ファイル保存中のエラー処理', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/output.woff2';
      const tempPath = '/test/output.woff2.tmp';

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockRejectedValue(new Error('ENOSPC: no space left on device'));
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        useTempFile: true 
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TEMP_FILE_RENAME_FAILED');
      expect(mockFs.unlink).toHaveBeenCalledWith(tempPath); // 一時ファイルのクリーンアップ
    });

    it('同時書き込み競合の検出', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/concurrent.woff2';

      // ファイルロックをシミュレート
      mockFs.writeFile.mockRejectedValue(new Error('EBUSY: resource busy or locked'));

      const result = await saveProcessedFont(testBuffer, outputPath);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_LOCKED');
      expect(result.error?.message).toContain('ファイルが他のプロセスで使用中');
      expect(result.error?.suggestions).toContain('しばらく待ってから再試行');
    });
  });

  describe('ユーザーインタラクション', () => {
    it('既存ファイル上書き確認ダイアログ', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/existing.woff2';

      mockFs.access.mockResolvedValue(undefined); // ファイル存在
      mockDialog.showMessageBox.mockResolvedValue({ response: 0 }); // Yes選択

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        confirmOverwrite: true 
      });

      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'question',
          message: expect.stringContaining('上書きしますか'),
          buttons: ['はい', 'いいえ', '名前を変更']
        })
      );
      expect(result.success).toBe(true);
    });

    it('上書き拒否時の代替ファイル名提案', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/existing.woff2';

      mockFs.access.mockResolvedValue(undefined); // ファイル存在
      mockDialog.showMessageBox.mockResolvedValue({ response: 2 }); // 名前を変更選択
      mockDialog.showSaveDialog.mockResolvedValue({ 
        canceled: false, 
        filePath: '/test/existing (1).woff2' 
      });

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        confirmOverwrite: true 
      });

      expect(mockDialog.showSaveDialog).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.actualPath).toBe('/test/existing (1).woff2');
    });

    it('保存場所選択ダイアログ', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');

      mockDialog.showSaveDialog.mockResolvedValue({ 
        canceled: false, 
        filePath: '/Users/test/Desktop/my_font.woff2' 
      });

      const result = await saveProcessedFont(testBuffer, null, { 
        showSaveDialog: true,
        defaultName: 'processed_font.woff2'
      });

      expect(mockDialog.showSaveDialog).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          defaultPath: expect.stringContaining('processed_font.woff2'),
          filters: expect.arrayContaining([
            { name: 'WOFF2フォント', extensions: ['woff2'] },
            { name: 'WOFFフォント', extensions: ['woff'] },
            { name: 'TrueTypeフォント', extensions: ['ttf'] },
            { name: 'OpenTypeフォント', extensions: ['otf'] }
          ])
        })
      );
      expect(result.success).toBe(true);
      expect(result.actualPath).toBe('/Users/test/Desktop/my_font.woff2');
    });

    it('保存ダイアログキャンセル時の処理', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');

      mockDialog.showSaveDialog.mockResolvedValue({ canceled: true });

      const result = await saveProcessedFont(testBuffer, null, { 
        showSaveDialog: true 
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_CANCELLED');
      expect(result.error?.message).toContain('ユーザーによりキャンセル');
    });
  });

  describe('保存後の検証', () => {
    it('保存されたファイルの整合性チェック', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/output.woff2';

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(testBuffer);

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        verifyAfterSave: true 
      });

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledWith(outputPath);
    });

    it('保存後の検証失敗時の処理', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const corruptedBuffer = Buffer.from('CORRUPTED_DATA');
      const outputPath = '/test/output.woff2';

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(corruptedBuffer);

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        verifyAfterSave: true 
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERIFICATION_FAILED');
      expect(result.error?.message).toContain('保存されたファイルの検証に失敗');
      expect(result.error?.suggestions).toContain('再度保存を試行');
    });

    it('ファイルサイズの記録と報告', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/output.woff2';

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        size: testBuffer.length,
        isFile: () => true
      } as any);

      const result = await saveProcessedFont(testBuffer, outputPath);

      expect(result.success).toBe(true);
      expect(result.fileSize).toBe(testBuffer.length);
      expect(result.stats?.bytesWritten).toBe(testBuffer.length);
    });
  });

  describe('エラー回復処理', () => {
    it('自動リトライ機能', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/output.woff2';

      let attemptCount = 0;
      mockFs.writeFile.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('EAGAIN: resource temporarily unavailable');
        }
        return; // 成功
      });

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        maxRetries: 3,
        retryDelay: 100
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(result.retryCount).toBe(2);
    });

    it('代替保存場所の提案', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/restricted/output.woff2';

      mockFs.writeFile.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        suggestAlternatives: true 
      });

      expect(result.success).toBe(false);
      expect(result.alternatives).toContain('/Users/test/Desktop/output.woff2');
      expect(result.alternatives).toContain('/Users/test/Documents/output.woff2');
      expect(result.alternatives).toContain('/tmp/output.woff2');
    });

    it('ログファイルへのエラー記録', async () => {
      const testBuffer = Buffer.from('TEST_FONT_DATA');
      const outputPath = '/test/output.woff2';
      const errorMessage = 'ENOSPC: no space left on device';

      mockFs.writeFile.mockRejectedValue(new Error(errorMessage));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await saveProcessedFont(testBuffer, outputPath, { 
        logErrors: true 
      });

      expect(result.success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FileSave Error]',
        expect.objectContaining({
          path: outputPath,
          error: errorMessage,
          timestamp: expect.any(Date)
        })
      );

      consoleSpy.mockRestore();
    });
  });
});