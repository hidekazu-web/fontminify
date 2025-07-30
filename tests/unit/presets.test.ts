import { describe, it, expect } from 'vitest';
import { CHARACTER_PRESETS } from '../../src/shared/presets';

describe('文字セットプリセットテスト（文字数確認）', () => {
  describe('ひらがな・カタカナプリセット', () => {
    it('ひらがなプリセットが正確な文字数を含む', () => {
      const hiraganaPreset = CHARACTER_PRESETS.find(p => p.id === 'hiragana_katakana');
      expect(hiraganaPreset).toBeDefined();
      
      const characters = hiraganaPreset!.characters;
      const uniqueChars = new Set(characters);
      
      // ひらがな基本文字 (46文字) + 濁音・半濁音 (25文字) + 小文字 (6文字) + 長音記号など
      expect(uniqueChars.size).toBeGreaterThanOrEqual(146);
      
      // ひらがなとカタカナが含まれることを確認
      expect(characters).toMatch(/[あいうえお]/);
      expect(characters).toMatch(/[アイウエオ]/);
      
      // 重複文字がないことを確認
      expect(uniqueChars.size).toBe(characters.length);
    });

    it('ひらがなプリセットに必要な文字が含まれている', () => {
      const hiraganaPreset = CHARACTER_PRESETS.find(p => p.id === 'hiragana_katakana');
      const characters = hiraganaPreset!.characters;
      
      // 基本ひらがな（五十音）
      const basicHiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
      for (const char of basicHiragana) {
        expect(characters).toContain(char);
      }
      
      // 基本カタカナ（五十音）
      const basicKatakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
      for (const char of basicKatakana) {
        expect(characters).toContain(char);
      }
      
      // 濁音・半濁音
      expect(characters).toMatch(/[がざだばぱ]/);
      expect(characters).toMatch(/[ガザダバパ]/);
      
      // 小文字
      expect(characters).toMatch(/[ぁぃぅぇぉ]/);
      expect(characters).toMatch(/[ァィゥェォ]/);
      
      // 長音記号
      expect(characters).toContain('ー');
    });
  });

  describe('ASCII文字プリセット', () => {
    it('ASCII文字プリセットが正確な文字数を含む', () => {
      const asciiPreset = CHARACTER_PRESETS.find(p => p.id === 'ascii');
      expect(asciiPreset).toBeDefined();
      
      const characters = asciiPreset!.characters;
      const uniqueChars = new Set(characters);
      
      // ASCII文字: a-z(26) + A-Z(26) + 0-9(10) + 記号(33) = 95文字
      expect(uniqueChars.size).toBe(95);
      expect(characters.length).toBe(95);
    });

    it('ASCII文字プリセットに必要な文字が含まれている', () => {
      const asciiPreset = CHARACTER_PRESETS.find(p => p.id === 'ascii');
      const characters = asciiPreset!.characters;
      
      // 小文字アルファベット
      for (let i = 97; i <= 122; i++) { // a-z
        expect(characters).toContain(String.fromCharCode(i));
      }
      
      // 大文字アルファベット
      for (let i = 65; i <= 90; i++) { // A-Z
        expect(characters).toContain(String.fromCharCode(i));
      }
      
      // 数字
      for (let i = 48; i <= 57; i++) { // 0-9
        expect(characters).toContain(String.fromCharCode(i));
      }
      
      // 基本記号
      const symbols = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
      for (const symbol of symbols) {
        expect(characters).toContain(symbol);
      }
      
      // スペース
      expect(characters).toContain(' ');
    });
  });

  describe('JLPT漢字プリセット', () => {
    it('JLPT N5漢字プリセットが適切な文字数を含む', () => {
      const n5Preset = CHARACTER_PRESETS.find(p => p.id === 'jlpt_n5');
      expect(n5Preset).toBeDefined();
      
      const characters = n5Preset!.characters;
      const uniqueChars = new Set(characters);
      
      // JLPT N5レベルの漢字は約80-100文字
      // ひらがな・カタカナ・基本記号も含むため、合計約300-400文字
      expect(uniqueChars.size).toBeGreaterThanOrEqual(300);
      expect(uniqueChars.size).toBeLessThanOrEqual(450);
      
      // 重複なし
      expect(uniqueChars.size).toBe(characters.length);
    });

    it('JLPT N4漢字プリセットがN5を包含する', () => {
      const n5Preset = CHARACTER_PRESETS.find(p => p.id === 'jlpt_n5');
      const n4Preset = CHARACTER_PRESETS.find(p => p.id === 'jlpt_n4');
      
      expect(n5Preset).toBeDefined();
      expect(n4Preset).toBeDefined();
      
      const n5Chars = new Set(n5Preset!.characters);
      const n4Chars = new Set(n4Preset!.characters);
      
      // N4はN5を包含する
      expect(n4Chars.size).toBeGreaterThan(n5Chars.size);
      
      // N5の全文字がN4に含まれる
      for (const char of n5Chars) {
        expect(n4Chars.has(char)).toBe(true);
      }
    });

    it('JLPT N3漢字プリセットがN4を包含する', () => {
      const n4Preset = CHARACTER_PRESETS.find(p => p.id === 'jlpt_n4');
      const n3Preset = CHARACTER_PRESETS.find(p => p.id === 'jlpt_n3');
      
      expect(n4Preset).toBeDefined();
      expect(n3Preset).toBeDefined();
      
      const n4Chars = new Set(n4Preset!.characters);
      const n3Chars = new Set(n3Preset!.characters);
      
      // N3はN4を包含する
      expect(n3Chars.size).toBeGreaterThan(n4Chars.size);
      
      // N4の全文字がN3に含まれる
      for (const char of n4Chars) {
        expect(n3Chars.has(char)).toBe(true);
      }
      
      // N3は約800-1000文字程度
      expect(n3Chars.size).toBeGreaterThanOrEqual(800);
      expect(n3Chars.size).toBeLessThanOrEqual(1200);
    });

    it('各JLPTプリセットに基本的な漢字が含まれている', () => {
      const n5Preset = CHARACTER_PRESETS.find(p => p.id === 'jlpt_n5');
      const characters = n5Preset!.characters;
      
      // N5レベルの基本漢字
      const basicKanji = ['日', '本', '人', '年', '時', '間', '学', '校', '先', '生'];
      for (const kanji of basicKanji) {
        expect(characters).toContain(kanji);
      }
      
      // 数字の漢字
      const numberKanji = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
      for (const kanji of numberKanji) {
        expect(characters).toContain(kanji);
      }
    });
  });

  describe('常用漢字プリセット', () => {
    it('常用漢字プリセットが適切な文字数を含む', () => {
      const joyoPreset = CHARACTER_PRESETS.find(p => p.id === 'joyo_kanji');
      expect(joyoPreset).toBeDefined();
      
      const characters = joyoPreset!.characters;
      const uniqueChars = new Set(characters);
      
      // 常用漢字は1,006字 + ひらがな・カタカナ・記号等
      // 合計で約1,200-1,400文字程度
      expect(uniqueChars.size).toBeGreaterThanOrEqual(1200);
      expect(uniqueChars.size).toBeLessThanOrEqual(1500);
    });

    it('常用漢字プリセットがJLPTプリセットを包含する', () => {
      const joyoPreset = CHARACTER_PRESETS.find(p => p.id === 'joyo_kanji');
      const n3Preset = CHARACTER_PRESETS.find(p => p.id === 'jlpt_n3');
      
      expect(joyoPreset).toBeDefined();
      expect(n3Preset).toBeDefined();
      
      const joyoChars = new Set(joyoPreset!.characters);
      const n3Chars = new Set(n3Preset!.characters);
      
      // 常用漢字はJLPT N3を包含する
      expect(joyoChars.size).toBeGreaterThan(n3Chars.size);
      
      // N3の漢字の大部分が常用漢字に含まれる（95%以上）
      let containedCount = 0;
      for (const char of n3Chars) {
        if (joyoChars.has(char)) {
          containedCount++;
        }
      }
      const containmentRatio = containedCount / n3Chars.size;
      expect(containmentRatio).toBeGreaterThan(0.95);
    });
  });

  describe('プリセット構造の検証', () => {
    it('全プリセットが必要なプロパティを持つ', () => {
      for (const preset of CHARACTER_PRESETS) {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('characters');
        expect(preset).toHaveProperty('estimatedChars');
        expect(preset).toHaveProperty('category');
        
        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.description).toBe('string');
        expect(typeof preset.characters).toBe('string');
        expect(typeof preset.estimatedChars).toBe('number');
        expect(typeof preset.category).toBe('string');
        
        expect(preset.id.length).toBeGreaterThan(0);
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.characters.length).toBeGreaterThan(0);
        expect(preset.estimatedChars).toBeGreaterThan(0);
      }
    });

    it('プリセットIDが重複していない', () => {
      const ids = CHARACTER_PRESETS.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('estimatedCharsが実際の文字数と一致または近似している', () => {
      for (const preset of CHARACTER_PRESETS) {
        const actualCount = new Set(preset.characters).size;
        const estimatedCount = preset.estimatedChars;
        
        // 推定値と実際の値の差が10%以内
        const difference = Math.abs(actualCount - estimatedCount);
        const tolerance = Math.max(actualCount, estimatedCount) * 0.1;
        
        expect(difference).toBeLessThanOrEqual(tolerance);
      }
    });

    it('カテゴリが適切に設定されている', () => {
      const validCategories = ['basic', 'japanese', 'advanced'];
      
      for (const preset of CHARACTER_PRESETS) {
        expect(validCategories).toContain(preset.category);
      }
    });
  });

  describe('文字の品質検証', () => {
    it('プリセットに制御文字が含まれていない', () => {
      for (const preset of CHARACTER_PRESETS) {
        for (const char of preset.characters) {
          const charCode = char.charCodeAt(0);
          
          // 制御文字（0-31, 127-159）が含まれていないことを確認
          expect(charCode).not.toBeLessThan(32);
          expect(charCode).not.toBe(127);
          if (charCode >= 128 && charCode <= 159) {
            // C1制御文字もチェック
            expect(charCode).not.toBeGreaterThanOrEqual(128);
            expect(charCode).not.toBeLessThanOrEqual(159);
          }
        }
      }
    });

    it('プリセットに私用領域文字が含まれていない', () => {
      for (const preset of CHARACTER_PRESETS) {
        for (const char of preset.characters) {
          const charCode = char.charCodeAt(0);
          
          // 私用領域（U+E000-U+F8FF）が含まれていないことを確認
          expect(charCode).not.toBeGreaterThanOrEqual(0xE000);
          expect(charCode).not.toBeLessThanOrEqual(0xF8FF);
        }
      }
    });

    it('サロゲートペアが正しく処理されている', () => {
      for (const preset of CHARACTER_PRESETS) {
        const characters = preset.characters;
        
        // サロゲートペアの検出
        for (let i = 0; i < characters.length; i++) {
          const charCode = characters.charCodeAt(i);
          
          if (charCode >= 0xD800 && charCode <= 0xDBFF) {
            // 高サロゲートが見つかった場合、次の文字が低サロゲートであることを確認
            expect(i + 1).toBeLessThan(characters.length);
            const nextCharCode = characters.charCodeAt(i + 1);
            expect(nextCharCode).toBeGreaterThanOrEqual(0xDC00);
            expect(nextCharCode).toBeLessThanOrEqual(0xDFFF);
            i++; // 次の文字をスキップ
          } else if (charCode >= 0xDC00 && charCode <= 0xDFFF) {
            // 低サロゲートが単独で現れることはない
            expect(true).toBe(false);
          }
        }
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きなプリセットの処理が効率的である', () => {
      const startTime = Date.now();
      
      for (const preset of CHARACTER_PRESETS) {
        // 文字セットのサイズ計算
        const uniqueChars = new Set(preset.characters);
        expect(uniqueChars.size).toBeGreaterThan(0);
        
        // 文字種別の分析
        let hiraganaCount = 0;
        let katakanaCount = 0;
        let kanjiCount = 0;
        let otherCount = 0;
        
        for (const char of uniqueChars) {
          const code = char.charCodeAt(0);
          if (code >= 0x3041 && code <= 0x3096) {
            hiraganaCount++;
          } else if (code >= 0x30A1 && code <= 0x30F6) {
            katakanaCount++;
          } else if (code >= 0x4E00 && code <= 0x9FAF) {
            kanjiCount++;
          } else {
            otherCount++;
          }
        }
        
        // 統計が意味のある値であることを確認
        expect(hiraganaCount + katakanaCount + kanjiCount + otherCount).toBe(uniqueChars.size);
      }
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('国際化対応', () => {
    it('Unicode正規化が適切に行われている', () => {
      for (const preset of CHARACTER_PRESETS) {
        const characters = preset.characters;
        const normalized = characters.normalize('NFC');
        
        // NFCで正規化されていることを確認
        expect(characters).toBe(normalized);
      }
    });

    it('結合文字が適切に処理されている', () => {
      for (const preset of CHARACTER_PRESETS) {
        const characters = preset.characters;
        
        // 結合文字の検出と検証
        for (let i = 0; i < characters.length; i++) {
          const char = characters[i];
          const category = getUnicodeCategory(char);
          
          // 結合文字（Mn, Mc, Me）が単独で存在しないことを確認
          if (['Mn', 'Mc', 'Me'].includes(category)) {
            // 結合文字の前に基底文字があることを確認
            expect(i).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});

// ヘルパー関数: Unicodeカテゴリの簡易判定
function getUnicodeCategory(char: string): string {
  const code = char.charCodeAt(0);
  
  // 簡易的な判定（実際のUnicodeデータベースを使用する場合はより詳細）
  if (code >= 0x0300 && code <= 0x036F) return 'Mn'; // Combining Diacritical Marks
  if (code >= 0x1AB0 && code <= 0x1AFF) return 'Mn'; // Combining Diacritical Marks Extended
  if (code >= 0x1DC0 && code <= 0x1DFF) return 'Mn'; // Combining Diacritical Marks Supplement
  if (code >= 0x20D0 && code <= 0x20FF) return 'Mn'; // Combining Diacritical Marks for Symbols
  if (code >= 0xFE20 && code <= 0xFE2F) return 'Mn'; // Combining Half Marks
  
  return 'Other';
}