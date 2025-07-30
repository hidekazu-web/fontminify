import { describe, it, expect } from 'vitest';
import { 
  validateFileList, 
  isValidFontFile, 
  validateSubsetOptions 
} from '@shared/validation';
import type { SubsetOptions } from '@shared/types';

describe('validation', () => {
  describe('isValidFontFile', () => {
    it('should accept valid font file extensions', () => {
      expect(isValidFontFile('font.ttf')).toBe(true);
      expect(isValidFontFile('font.otf')).toBe(true);
      expect(isValidFontFile('font.woff')).toBe(true);
      expect(isValidFontFile('font.woff2')).toBe(true);
    });

    it('should reject invalid file extensions', () => {
      expect(isValidFontFile('file.txt')).toBe(false);
      expect(isValidFontFile('file.pdf')).toBe(false);
      expect(isValidFontFile('file.jpg')).toBe(false);
      expect(isValidFontFile('file')).toBe(false);
    });

    it('should handle case insensitive extensions', () => {
      expect(isValidFontFile('font.TTF')).toBe(true);
      expect(isValidFontFile('font.OTF')).toBe(true);
      expect(isValidFontFile('font.WOFF')).toBe(true);
      expect(isValidFontFile('font.WOFF2')).toBe(true);
    });

    it('should reject empty or invalid filenames', () => {
      expect(isValidFontFile('')).toBe(false);
      expect(isValidFontFile('.ttf')).toBe(false);
      expect(isValidFontFile('font.')).toBe(false);
    });
  });

  describe('validateFileList', () => {
    it('should validate a list of font files', () => {
      const files = ['font1.ttf', 'font2.otf', 'font3.woff2'];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });

    it('should separate valid and invalid files', () => {
      const files = ['font.ttf', 'image.jpg', 'document.pdf', 'font.woff'];
      const result = validateFileList(files);
      
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(2);
      expect(result.valid.map(v => v.file)).toEqual(['font.ttf', 'font.woff']);
      expect(result.invalid.map(v => v.file)).toEqual(['image.jpg', 'document.pdf']);
    });

    it('should handle empty file list', () => {
      const result = validateFileList([]);
      
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(0);
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('should provide error messages for invalid files', () => {
      const files = ['invalid.txt'];
      const result = validateFileList(files);
      
      expect(result.invalid[0].errors).toContain('サポートされていないファイル形式です');
    });
  });

  describe('validateSubsetOptions', () => {
    const validOptions: SubsetOptions = {
      inputPath: '/path/to/font.ttf',
      outputPath: '/path/to/output.woff2',
      outputFormat: 'woff2',
      preset: 'minimum',
      enableWoff2Compression: true,
      compressionLevel: 6,
      removeHinting: false,
      desubroutinize: false
    };

    it('should validate complete subset options', () => {
      const result = validateSubsetOptions(validOptions);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require inputPath', () => {
      const options = { ...validOptions, inputPath: '' };
      const result = validateSubsetOptions(options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('入力ファイルパスが必要です');
    });

    it('should validate outputFormat', () => {
      const options = { ...validOptions, outputFormat: 'invalid' as any };
      const result = validateSubsetOptions(options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('無効な出力形式です');
    });

    it('should validate compressionLevel range', () => {
      const options = { ...validOptions, compressionLevel: 15 };
      const result = validateSubsetOptions(options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('圧縮レベルは0-10の範囲で指定してください');
    });

    it('should require preset or customCharacters', () => {
      const options = { ...validOptions, preset: undefined, customCharacters: undefined };
      const result = validateSubsetOptions(options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('プリセットまたはカスタム文字セットが必要です');
    });

    it('should validate custom characters when provided', () => {
      const options = { 
        ...validOptions, 
        preset: undefined, 
        customCharacters: 'あいうえお' 
      };
      const result = validateSubsetOptions(options);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});