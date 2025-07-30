import { describe, it, expect } from 'vitest';
import { 
  getCharacterSetFromPreset, 
  getUniqueCharacters, 
  CHARACTER_PRESETS 
} from '@shared/presets';

describe('presets', () => {
  describe('CHARACTER_PRESETS', () => {
    it('should contain all expected presets', () => {
      const presetIds = CHARACTER_PRESETS.map(p => p.id);
      
      expect(presetIds).toContain('minimum');
      expect(presetIds).toContain('basic');
      expect(presetIds).toContain('standard');
      expect(presetIds).toContain('extended');
      expect(presetIds).toContain('full');
    });

    it('should have valid preset structure', () => {
      CHARACTER_PRESETS.forEach(preset => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('characterCount');
        expect(preset).toHaveProperty('characters');
        expect(preset).toHaveProperty('categories');

        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.description).toBe('string');
        expect(typeof preset.characterCount).toBe('number');
        expect(typeof preset.characters).toBe('string');
        expect(Array.isArray(preset.categories)).toBe(true);
      });
    });

    it('should have character counts matching actual characters', () => {
      CHARACTER_PRESETS.forEach(preset => {
        const uniqueChars = new Set(preset.characters).size;
        expect(preset.characterCount).toBe(uniqueChars);
      });
    });

    it('should have progressive character counts', () => {
      const counts = CHARACTER_PRESETS.map(p => p.characterCount);
      
      // 各プリセットは前のプリセットより多くの文字を含むはず
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThan(counts[i - 1]);
      }
    });
  });

  describe('getCharacterSetFromPreset', () => {
    it('should return character set for valid preset', () => {
      const minimumChars = getCharacterSetFromPreset('minimum');
      const basicChars = getCharacterSetFromPreset('basic');
      
      expect(minimumChars).toBeTruthy();
      expect(basicChars).toBeTruthy();
      expect(minimumChars.length).toBeGreaterThan(0);
      expect(basicChars.length).toBeGreaterThan(minimumChars.length);
    });

    it('should return empty string for invalid preset', () => {
      const result = getCharacterSetFromPreset('invalid');
      expect(result).toBe('');
    });

    it('should return consistent results', () => {
      const result1 = getCharacterSetFromPreset('minimum');
      const result2 = getCharacterSetFromPreset('minimum');
      
      expect(result1).toBe(result2);
    });

    it('should include basic Japanese characters in minimum set', () => {
      const minimumChars = getCharacterSetFromPreset('minimum');
      
      // ひらがなの基本文字が含まれているかチェック
      expect(minimumChars).toContain('あ');
      expect(minimumChars).toContain('い');
      expect(minimumChars).toContain('う');
      
      // カタカナの基本文字が含まれているかチェック
      expect(minimumChars).toContain('ア');
      expect(minimumChars).toContain('イ');
      expect(minimumChars).toContain('ウ');
    });

    it('should include ASCII characters in basic set', () => {
      const basicChars = getCharacterSetFromPreset('basic');
      
      // 数字
      expect(basicChars).toContain('0');
      expect(basicChars).toContain('9');
      
      // アルファベット
      expect(basicChars).toContain('A');
      expect(basicChars).toContain('Z');
      expect(basicChars).toContain('a');
      expect(basicChars).toContain('z');
    });
  });

  describe('getUniqueCharacters', () => {
    it('should remove duplicate characters', () => {
      const input = 'あああいいいううう';
      const result = getUniqueCharacters(input);
      
      expect(result).toBe('あいう');
    });

    it('should preserve order of first occurrence', () => {
      const input = 'abcabc';
      const result = getUniqueCharacters(input);
      
      expect(result).toBe('abc');
    });

    it('should handle empty string', () => {
      const result = getUniqueCharacters('');
      expect(result).toBe('');
    });

    it('should handle mixed character types', () => {
      const input = 'あaいbうc123あa';
      const result = getUniqueCharacters(input);
      
      expect(result).toBe('あaいbうc123');
    });

    it('should handle special characters', () => {
      const input = '！？。、「」()';
      const result = getUniqueCharacters(input);
      
      expect(result).toBe('！？。、「」()');
    });

    it('should handle unicode characters', () => {
      const input = '🎵🎶🎵🎵🎶';
      const result = getUniqueCharacters(input);
      
      expect(result).toBe('🎵🎶');
    });
  });

  describe('preset integration', () => {
    it('should have minimum preset as subset of basic', () => {
      const minimumChars = getCharacterSetFromPreset('minimum');
      const basicChars = getCharacterSetFromPreset('basic');
      
      // minimumの全ての文字がbasicに含まれているかチェック
      for (const char of minimumChars) {
        expect(basicChars).toContain(char);
      }
    });

    it('should have progressive inclusion', () => {
      const presets = ['minimum', 'basic', 'standard'];
      const charSets = presets.map(p => getCharacterSetFromPreset(p));
      
      // 前のセットが次のセットに含まれているかチェック
      for (let i = 1; i < charSets.length; i++) {
        for (const char of charSets[i - 1]) {
          expect(charSets[i]).toContain(char);
        }
      }
    });
  });
});