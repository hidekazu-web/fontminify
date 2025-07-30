import { describe, it, expect } from 'vitest';

describe('カスタム文字セットテスト（重複文字、特殊文字）', () => {
  // カスタム文字セット処理のヘルパー関数
  function processCustomCharacterSet(input: string): string {
    // 重複文字を除去し、順序を保持
    const seen = new Set<string>();
    const result: string[] = [];
    
    for (const char of input) {
      if (!seen.has(char)) {
        seen.add(char);
        result.push(char);
      }
    }
    
    return result.join('');
  }
  
  function validateCharacterSet(input: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (input.length === 0) {
      errors.push('文字セットが空です');
    }
    
    if (input.length > 10000) {
      errors.push('文字セットが大きすぎます（最大10,000文字）');
    }
    
    // 制御文字のチェック
    for (const char of input) {
      const code = char.charCodeAt(0);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        errors.push('制御文字が含まれています');
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  describe('重複文字の処理', () => {
    it('重複する基本文字が正しく除去される', () => {
      const input = 'aabbccddee';
      const result = processCustomCharacterSet(input);
      expect(result).toBe('abcde');
    });

    it('重複するひらがなが正しく除去される', () => {
      const input = 'あああいいいううう';
      const result = processCustomCharacterSet(input);
      expect(result).toBe('あいう');
    });

    it('重複するカタカナが正しく除去される', () => {
      const input = 'アアアイイイウウウ';
      const result = processCustomCharacterSet(input);
      expect(result).toBe('アイウ');
    });

    it('重複する漢字が正しく除去される', () => {
      const input = '日日本本語語語';
      const result = processCustomCharacterSet(input);
      expect(result).toBe('日本語');
    });

    it('複雑な重複パターンが正しく処理される', () => {
      const input = 'abcabcdefdefghighi';
      const result = processCustomCharacterSet(input);
      expect(result).toBe('abcdefghi');
    });

    it('順序が保持される', () => {
      const input = 'zyxwvutsrqponmlkjihgfedcba';
      const result = processCustomCharacterSet(input);
      expect(result).toBe('zyxwvutsrqponmlkjihgfedcba');
    });

    it('大量の重複文字が効率的に処理される', () => {
      // 10,000文字のうち実際はabc の3文字のみ
      const input = 'abc'.repeat(3333) + 'a';
      const result = processCustomCharacterSet(input);
      expect(result).toBe('abc');
      expect(result.length).toBe(3);
    });
  });

  describe('特殊文字の処理', () => {
    it('基本的な記号文字が正しく処理される', () => {
      const input = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
      expect(result.length).toBe(32);
    });

    it('日本語句読点が正しく処理される', () => {
      const input = '。、・「」『』（）〔〕【】〈〉《》';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('数学記号が正しく処理される', () => {
      const input = '±×÷∑∫∂∆∇√∞≠≤≥⊂⊃∈∉∪∩';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('通貨記号が正しく処理される', () => {
      const input = '¥$€£¢₩₹₽';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('矢印記号が正しく処理される', () => {
      const input = '←→↑↓↖↗↘↙⇐⇒⇑⇓';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('罫線文字が正しく処理される', () => {
      const input = '─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('丸囲み数字が正しく処理される', () => {
      const input = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('ローマ数字が正しく処理される', () => {
      const input = 'ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });
  });

  describe('Unicode特殊ケース', () => {
    it('絵文字が正しく処理される', () => {
      const input = '😀😁😂🤣😃😄😅😆😉😊';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('サロゲートペアが正しく処理される', () => {
      // 𠮷（つちよし）など
      const input = '𠮷𩸽𡦸𠀋';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('結合文字が正しく処理される', () => {
      // é (e + 結合アクセント) 
      const input = 'café';
      const result = processCustomCharacterSet(input);
      expect(result).toBe(input);
    });

    it('異体字セレクタが正しく処理される', () => {
      // 葛󠄀（異体字セレクタ付き）
      const input = '葛葛󠄀';
      const result = processCustomCharacterSet(input);
      // 異体字セレクタを考慮した重複除去
      expect(result.length).toBeGreaterThan(1);
    });

    it('ゼロ幅文字が適切に処理される', () => {
      const input = 'a\u200Bb\u200Cc\u200Dd';
      const result = processCustomCharacterSet(input);
      // ゼロ幅文字も含めて処理される
      expect(result.length).toBe(7);
    });
  });

  describe('文字セットバリデーション', () => {
    it('有効な文字セットが承認される', () => {
      const validSets = [
        'abc123',
        'あいうえお',
        'アイウエオ',
        '日本語',
        '!"#$%',
        'aあア漢123!@#'
      ];

      for (const set of validSets) {
        const validation = validateCharacterSet(set);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('空の文字セットが拒否される', () => {
      const validation = validateCharacterSet('');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('文字セットが空です');
    });

    it('大きすぎる文字セットが拒否される', () => {
      const largeSet = 'a'.repeat(10001);
      const validation = validateCharacterSet(largeSet);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('文字セットが大きすぎます（最大10,000文字）');
    });

    it('制御文字が拒否される', () => {
      const controlCharSet = 'abc\x01def';
      const validation = validateCharacterSet(controlCharSet);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('制御文字が含まれています');
    });

    it('許可された制御文字は承認される', () => {
      const allowedControlChars = 'abc\tdef\nghi\rjkl'; // タブ、改行、復帰
      const validation = validateCharacterSet(allowedControlChars);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きな文字セットが効率的に処理される', () => {
      // 5,000ユニーク文字 + 5,000重複文字
      const uniqueChars = Array.from({ length: 5000 }, (_, i) => 
        String.fromCharCode(0x4E00 + i) // CJK漢字
      ).join('');
      const duplicates = uniqueChars; // 同じ文字を再度追加
      const input = uniqueChars + duplicates;

      const startTime = Date.now();
      const result = processCustomCharacterSet(input);
      const processingTime = Date.now() - startTime;

      expect(result.length).toBe(5000); // 重複が除去されている
      expect(processingTime).toBeLessThan(1000); // 1秒以内
    });

    it('最大サイズの文字セットが処理される', () => {
      const maxSizeSet = Array.from({ length: 10000 }, (_, i) => 
        String.fromCharCode(0x3000 + (i % 1000)) // 日本語文字範囲
      ).join('');

      const startTime = Date.now();
      const result = processCustomCharacterSet(maxSizeSet);
      const processingTime = Date.now() - startTime;

      expect(result.length).toBeLessThanOrEqual(1000); // 重複除去後
      expect(processingTime).toBeLessThan(2000); // 2秒以内
    });
  });

  describe('実用的な文字セット例', () => {
    it('ウェブサイト用基本文字セット', () => {
      const webBasic = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン日本語漢字。、！？';
      
      const result = processCustomCharacterSet(webBasic);
      const validation = validateCharacterSet(result);
      
      expect(validation.isValid).toBe(true);
      expect(result.length).toBeGreaterThan(100);
    });

    it('名前用文字セット', () => {
      const nameChars = '田中佐藤高橋小林加藤山田渡辺松本井上木村林清水山口阿部森池橋本石川斎藤前田藤井後藤岡田長谷川村上近藤石田中村藤本小野岡本今井河野藤原上田東野菅原大野杉山金子宮崎中島久保原田和田石井中山杉本山本岩田武田上野大塚千葉斎木森田三浦水野';
      
      const result = processCustomCharacterSet(nameChars);
      const validation = validateCharacterSet(result);
      
      expect(validation.isValid).toBe(true);
      expect(result).toMatch(/[田中佐藤]/);
    });

    it('数式用文字セット', () => {
      const mathChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-×÷±=≠<>≤≥∞∑∫∂√π∆αβγθλμσφψω()[]{}|';
      
      const result = processCustomCharacterSet(mathChars);
      const validation = validateCharacterSet(result);
      
      expect(validation.isValid).toBe(true);
      expect(result).toMatch(/[αβγ]/);
      expect(result).toMatch(/[∑∫√]/);
    });
  });

  describe('エッジケース', () => {
    it('同じ文字の異なる形（全角・半角）', () => {
      const input = 'aａ1１!！';
      const result = processCustomCharacterSet(input);
      
      // 全角・半角は別文字として扱われる
      expect(result).toBe('aａ1１!！');
      expect(result.length).toBe(6);
    });

    it('ひらがなとカタカナの同音文字', () => {
      const input = 'あアいイうウ';
      const result = processCustomCharacterSet(input);
      
      // ひらがなとカタカナは別文字として扱われる
      expect(result).toBe('あアいイうウ');
      expect(result.length).toBe(6);
    });

    it('異なる字体の同じ漢字', () => {
      const input = '鳥鳥'; // 同じ字
      const result = processCustomCharacterSet(input);
      
      expect(result).toBe('鳥');
      expect(result.length).toBe(1);
    });

    it('空白文字の種類', () => {
      const input = ' 　\t\n\r'; // 半角スペース、全角スペース、タブ、改行、復帰
      const result = processCustomCharacterSet(input);
      
      expect(result.length).toBe(5); // すべて異なる文字として扱われる
    });

    it('nullやundefinedの処理', () => {
      expect(() => processCustomCharacterSet(null as any)).toThrow();
      expect(() => processCustomCharacterSet(undefined as any)).toThrow();
    });
  });
});