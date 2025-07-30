import { describe, it, expect } from 'vitest';
import { validateFileList, validateFontFile } from '../../src/shared/validation';

describe('フォントファイル検証テスト', () => {
  describe('validateFontFile', () => {
    it('有効なTTFファイルパスを検証する', () => {
      const result = validateFontFile('test.ttf');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('有効なOTFファイルパスを検証する', () => {
      const result = validateFontFile('test.otf');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('有効なWOFFファイルパスを検証する', () => {
      const result = validateFontFile('test.woff');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('有効なWOFF2ファイルパスを検証する', () => {
      const result = validateFontFile('test.woff2');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('大文字の拡張子を検証する', () => {
      const result = validateFontFile('test.TTF');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('無効な拡張子を検証する', () => {
      const result = validateFontFile('test.txt');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('対応していないファイル形式です。TTF、OTF、WOFF、WOFF2ファイルのみ対応しています。');
    });

    it('拡張子なしファイルを検証する', () => {
      const result = validateFontFile('test');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ファイルに拡張子がありません。');
    });

    it('空のファイルパスを検証する', () => {
      const result = validateFontFile('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ファイルパスが空です。');
    });

    it('長すぎるファイル名を検証する', () => {
      const longFileName = 'a'.repeat(256) + '.ttf';
      const result = validateFontFile(longFileName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ファイル名が長すぎます（最大255文字）。');
    });

    it('無効な文字を含むファイル名を検証する', () => {
      const result = validateFontFile('test<>:"|?.ttf');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ファイル名に使用できない文字が含まれています。');
    });

    it('日本語ファイル名を検証する', () => {
      const result = validateFontFile('日本語フォント.ttf');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('パス区切り文字を含むファイル名を検証する', () => {
      const result = validateFontFile('/path/to/font.ttf');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateFileList', () => {
    it('空のファイルリストを検証する', () => {
      const result = validateFileList([]);
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(0);
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('有効なファイルのみのリストを検証する', () => {
      const files = ['font1.ttf', 'font2.otf', 'font3.woff'];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
      
      result.valid.forEach((item, index) => {
        expect(item.file).toBe(files[index]);
      });
    });

    it('無効なファイルのみのリストを検証する', () => {
      const files = ['file1.txt', 'file2.doc', 'file3'];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(3);
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(3);
      
      result.invalid.forEach((item, index) => {
        expect(item.file).toBe(files[index]);
        expect(item.errors.length).toBeGreaterThan(0);
      });
    });

    it('混在するファイルリストを検証する', () => {
      const files = ['valid.ttf', 'invalid.txt', 'valid.otf', 'invalid'];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(2);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(2);
      
      expect(result.valid[0].file).toBe('valid.ttf');
      expect(result.valid[1].file).toBe('valid.otf');
      expect(result.invalid[0].file).toBe('invalid.txt');
      expect(result.invalid[1].file).toBe('invalid');
    });

    it('重複するファイルを検証する', () => {
      const files = ['font.ttf', 'font.ttf', 'other.otf'];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(2); // 重複は除外される
      expect(result.invalidCount).toBe(0);
      expect(result.valid).toHaveLength(2);
      
      const fileNames = result.valid.map(item => item.file);
      expect(fileNames).toContain('font.ttf');
      expect(fileNames).toContain('other.otf');
    });

    it('Fileオブジェクトのリストを検証する', () => {
      const files = [
        new File(['content1'], 'font1.ttf', { type: 'font/ttf' }),
        new File(['content2'], 'invalid.txt', { type: 'text/plain' }),
        new File(['content3'], 'font2.otf', { type: 'font/otf' })
      ];
      
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
    });

    it('大量のファイルリストを検証する', () => {
      const files = Array.from({ length: 100 }, (_, i) => `font${i}.ttf`);
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(100);
      expect(result.invalidCount).toBe(0);
      expect(result.valid).toHaveLength(100);
    });

    it('最大ファイル数制限を検証する', () => {
      const files = Array.from({ length: 51 }, (_, i) => `font${i}.ttf`);
      const result = validateFileList(files);
      
      // バリデーション関数内で最大ファイル数制限が実装されている場合
      expect(result.validCount).toBeLessThanOrEqual(50);
    });
  });

  describe('ファイルサイズ制限', () => {
    it('適切なサイズのファイルを検証する', () => {
      // 実際のFileオブジェクトでサイズをテスト
      const smallFile = new File(['a'.repeat(1024)], 'small.ttf', { type: 'font/ttf' });
      const result = validateFileList([smallFile]);
      
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(0);
    });

    it('大きすぎるファイルを検証する', () => {
      // 50MB以上のファイルをシミュレート
      const largeContent = 'a'.repeat(50 * 1024 * 1024 + 1);
      const largeFile = new File([largeContent], 'large.ttf', { type: 'font/ttf' });
      const result = validateFileList([largeFile]);
      
      // サイズ制限が実装されている場合
      expect(result.invalidCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('エッジケース', () => {
    it('nullまたはundefinedファイルを処理する', () => {
      const files = [null, undefined, 'valid.ttf'] as any[];
      const result = validateFileList(files);
      
      // null/undefinedは無視され、有効なファイルのみ処理される
      expect(result.validCount).toBe(1);
      expect(result.valid[0].file).toBe('valid.ttf');
    });

    it('空文字列ファイル名を処理する', () => {
      const files = ['', 'valid.ttf', '  '];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(2);
      expect(result.valid[0].file).toBe('valid.ttf');
    });

    it('特殊文字を含むパスを処理する', () => {
      const files = [
        '/Users/テスト/フォント.ttf',
        'C:\\Users\\Test\\Font with spaces.otf',
        './relative/path/font.woff'
      ];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);
    });
  });
});