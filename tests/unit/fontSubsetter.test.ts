import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subsetFont, compressToWoff2, calculateCompressionStats } from '../../src/main/services/fontSubsetter';
import * as fs from 'fs/promises';

// Mock subset-font
vi.mock('subset-font', () => ({
  default: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

// Mock subset-font function
const mockSubsetFont = vi.mocked(await import('subset-font')).default;

describe('サブセット化処理テスト（出力ファイル検証）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的なサブセット化', () => {
    it('TTFフォントのサブセット化が正しく動作する', async () => {
      const originalBuffer = Buffer.from('original-font-data');
      const subsetBuffer = Buffer.from('subset-font-data');
      
      mockFs.readFile.mockResolvedValue(originalBuffer);
      mockSubsetFont.mockResolvedValue(subsetBuffer);

      const options = {
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.ttf',
        characters: 'abcあいう漢字',
        outputFormat: 'ttf' as const,
        enableWoff2Compression: false,
        removeHinting: false,
        preserveGlyphOrder: true
      };

      const progressCallback = vi.fn();
      const result = await subsetFont(options, progressCallback);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/test/output.ttf');
      expect(result.outputBuffer).toEqual(subsetBuffer);
      expect(result.originalSize).toBe(originalBuffer.length);
      expect(result.outputSize).toBe(subsetBuffer.length);
      
      // プログレスコールバックが呼ばれたことを確認
      expect(progressCallback).toHaveBeenCalled();
    });

    it('OTFフォントのサブセット化が正しく動作する', async () => {
      const originalBuffer = Buffer.from('original-otf-data');
      const subsetBuffer = Buffer.from('subset-otf-data');
      
      mockFs.readFile.mockResolvedValue(originalBuffer);
      mockSubsetFont.mockResolvedValue(subsetBuffer);

      const options = {
        inputPath: '/test/font.otf',
        outputPath: '/test/output.otf',
        characters: 'abcdefg',
        outputFormat: 'otf' as const,
        enableWoff2Compression: false,
        removeHinting: true,
        preserveGlyphOrder: false
      };

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      expect(result.outputFormat).toBe('otf');
      expect(mockSubsetFont).toHaveBeenCalledWith(
        originalBuffer,
        expect.objectContaining({
          targetFormat: 'otf',
          text: 'abcdefg',
          removeHinting: true,
          preserveGlyphOrder: false
        })
      );
    });

    it('文字セットが正しく処理される', async () => {
      const originalBuffer = Buffer.from('font-data');
      const subsetBuffer = Buffer.from('subset-data');
      
      mockFs.readFile.mockResolvedValue(originalBuffer);
      mockSubsetFont.mockResolvedValue(subsetBuffer);

      const testCases = [
        {
          input: 'abc123',
          expected: 'abc123'
        },
        {
          input: 'あいうえお',
          expected: 'あいうえお'
        },
        {
          input: 'ABC漢字ひらがなカタカナ',
          expected: 'ABC漢字ひらがなカタカナ'
        },
        {
          input: 'aabbcc', // 重複文字
          expected: 'abc' // 重複は除去される
        }
      ];

      for (const testCase of testCases) {
        mockSubsetFont.mockClear();
        
        const options = {
          inputPath: '/test/font.ttf',
          outputPath: '/test/output.ttf',
          characters: testCase.input,
          outputFormat: 'ttf' as const
        };

        await subsetFont(options);

        expect(mockSubsetFont).toHaveBeenCalledWith(
          originalBuffer,
          expect.objectContaining({
            text: testCase.expected
          })
        );
      }
    });

    it('大きな文字セットが効率的に処理される', async () => {
      const originalBuffer = Buffer.from('large-font-data');
      const subsetBuffer = Buffer.from('large-subset-data');
      
      mockFs.readFile.mockResolvedValue(originalBuffer);
      mockSubsetFont.mockResolvedValue(subsetBuffer);

      // 10,000文字の大きな文字セットを作成
      const largeCharacterSet = Array.from({ length: 10000 }, (_, i) => 
        String.fromCharCode(0x4E00 + (i % 1000)) // CJK漢字範囲
      ).join('');

      const options = {
        inputPath: '/test/large-font.ttf',
        outputPath: '/test/large-output.ttf',
        characters: largeCharacterSet,
        outputFormat: 'ttf' as const
      };

      const startTime = Date.now();
      const result = await subsetFont(options);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(10000); // 10秒以内
    });
  });

  describe('出力形式の変換', () => {
    it('TTFからWOFFに変換される', async () => {
      const originalBuffer = Buffer.from('ttf-data');
      const woffBuffer = Buffer.from('woff-data');
      
      mockFs.readFile.mockResolvedValue(originalBuffer);
      mockSubsetFont.mockResolvedValue(woffBuffer);

      const options = {
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.woff',
        characters: 'abc',
        outputFormat: 'woff' as const
      };

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      expect(result.outputFormat).toBe('woff');
      expect(mockSubsetFont).toHaveBeenCalledWith(
        originalBuffer,
        expect.objectContaining({
          targetFormat: 'woff'
        })
      );
    });

    it('任意の形式からWOFF2に変換される', async () => {
      const originalBuffer = Buffer.from('original-data');
      const woff2Buffer = Buffer.from('woff2-data');
      
      mockFs.readFile.mockResolvedValue(originalBuffer);
      mockSubsetFont.mockResolvedValue(woff2Buffer);

      const options = {
        inputPath: '/test/font.otf',
        outputPath: '/test/output.woff2',
        characters: 'test',
        outputFormat: 'woff2' as const,
        enableWoff2Compression: true
      };

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      expect(result.outputFormat).toBe('woff2');
      expect(mockSubsetFont).toHaveBeenCalledWith(
        originalBuffer,
        expect.objectContaining({
          targetFormat: 'woff2'
        })
      );
    });
  });

  describe('オプションの処理', () => {
    it('ヒンティング削除オプションが正しく適用される', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('font-data'));
      mockSubsetFont.mockResolvedValue(Buffer.from('output-data'));

      const options = {
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.ttf',
        characters: 'abc',
        outputFormat: 'ttf' as const,
        removeHinting: true
      };

      await subsetFont(options);

      expect(mockSubsetFont).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          removeHinting: true
        })
      );
    });

    it('グリフ順序保持オプションが正しく適用される', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('font-data'));
      mockSubsetFont.mockResolvedValue(Buffer.from('output-data'));

      const options = {
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.ttf',
        characters: 'abc',
        outputFormat: 'ttf' as const,
        preserveGlyphOrder: false
      };

      await subsetFont(options);

      expect(mockSubsetFont).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          preserveGlyphOrder: false
        })
      );
    });
  });

  describe('プログレス更新', () => {
    it('プログレス更新が適切に行われる', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('font-data'));
      
      // subset-fontが非同期処理をシミュレート
      mockSubsetFont.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return Buffer.from('output-data');
      });

      const progressCallback = vi.fn();
      const options = {
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.ttf',
        characters: 'abc',
        outputFormat: 'ttf' as const
      };

      await subsetFont(options, progressCallback);

      // プログレスコールバックが複数回呼ばれることを確認
      expect(progressCallback).toHaveBeenCalledTimes(4);
      
      // 各段階での進捗確認
      expect(progressCallback).toHaveBeenNthCalledWith(1, {
        phase: 'analyzing',
        progress: 25,
        message: 'フォントファイルを解析中...'
      });
      
      expect(progressCallback).toHaveBeenNthCalledWith(2, {
        phase: 'subsetting',
        progress: 50,
        message: 'フォントをサブセット化中...'
      });
      
      expect(progressCallback).toHaveBeenNthCalledWith(3, {
        phase: 'optimizing',
        progress: 75,
        message: '最適化中...'
      });
      
      expect(progressCallback).toHaveBeenNthCalledWith(4, {
        phase: 'complete',
        progress: 100,
        message: 'サブセット化完了'
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルでエラーを返す', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));

      const options = {
        inputPath: '/test/nonexistent.ttf',
        outputPath: '/test/output.ttf',
        characters: 'abc',
        outputFormat: 'ttf' as const
      };

      const result = await subsetFont(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイルが見つかりません');
    });

    it('subset-fontのエラーを適切に処理する', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('font-data'));
      mockSubsetFont.mockRejectedValue(new Error('Invalid font format'));

      const options = {
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.ttf',
        characters: 'abc',
        outputFormat: 'ttf' as const
      };

      const result = await subsetFont(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('サブセット化に失敗しました');
    });

    it('無効な文字セットでエラーを返す', async () => {
      const options = {
        inputPath: '/test/font.ttf',
        outputPath: '/test/output.ttf',
        characters: '', // 空の文字セット
        outputFormat: 'ttf' as const
      };

      const result = await subsetFont(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('文字セットが空です');
    });
  });
});

describe('WOFF2圧縮テスト（圧縮率確認）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('圧縮機能', () => {
    it('WOFF2圧縮が正しく動作する', async () => {
      const originalBuffer = Buffer.from('a'.repeat(10000)); // 10KB
      const compressedBuffer = Buffer.from('b'.repeat(3000)); // 3KB (70%圧縮)

      // subset-fontのWOFF2モードをモック
      mockSubsetFont.mockResolvedValue(compressedBuffer);

      const result = await compressToWoff2(originalBuffer);

      expect(result.length).toBe(3000);
      expect(result).toEqual(compressedBuffer);
    });

    it('圧縮オプションが正しく適用される', async () => {
      const originalBuffer = Buffer.from('test-data');
      const compressedBuffer = Buffer.from('compressed');

      mockSubsetFont.mockResolvedValue(compressedBuffer);

      const options = {
        compressionLevel: 9,
        transformGlyf: true,
        removeHinting: true,
        desubroutinize: false
      };

      await compressToWoff2(originalBuffer, options);

      expect(mockSubsetFont).toHaveBeenCalledWith(
        originalBuffer,
        expect.objectContaining({
          targetFormat: 'woff2',
          compressionLevel: 9,
          transformGlyf: true,
          removeHinting: true,
          desubroutinize: false
        })
      );
    });
  });

  describe('ストレステスト', () => {
    it('大きなフォントファイルの圧縮が効率的に行われる', async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      const compressedBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB (90%圧縮)

      mockSubsetFont.mockResolvedValue(compressedBuffer);

      const startTime = Date.now();
      const result = await compressToWoff2(largeBuffer);
      const processingTime = Date.now() - startTime;

      expect(result.length).toBe(2 * 1024 * 1024);
      expect(processingTime).toBeLessThan(15000); // 15秒以内
    });

    it('メモリ使用量が適切に管理される', async () => {
      const originalBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      const compressedBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB

      mockSubsetFont.mockResolvedValue(compressedBuffer);

      const initialMemory = process.memoryUsage().heapUsed;
      const result = await compressToWoff2(originalBuffer);
      const finalMemory = process.memoryUsage().heapUsed;

      // メモリ使用量の増加が元ファイルサイズの2倍以下
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(originalBuffer.length * 2);
      
      expect(result.length).toBe(5 * 1024 * 1024);
    });
  });
});

describe('圧縮統計計算', () => {
  describe('calculateCompressionStats', () => {
    it('圧縮統計が正しく計算される', () => {
      const originalSize = 10000; // 10KB
      const compressedSize = 3000; // 3KB

      const stats = calculateCompressionStats(originalSize, compressedSize);

      expect(stats.originalSize).toBe(10000);
      expect(stats.compressedSize).toBe(3000);
      expect(stats.compressionRatio).toBe(0.3); // 30%
      expect(stats.reductionPercentage).toBe(70); // 70%削減
      expect(stats.savedBytes).toBe(7000); // 7KB節約
    });

    it('圧縮効果がない場合の統計', () => {
      const originalSize = 5000;
      const compressedSize = 5500; // 逆に増加

      const stats = calculateCompressionStats(originalSize, compressedSize);

      expect(stats.compressionRatio).toBe(1.1);
      expect(stats.reductionPercentage).toBe(-10); // 10%増加
      expect(stats.savedBytes).toBe(-500); // 500バイト増加
    });

    it('完全圧縮の統計', () => {
      const originalSize = 1000;
      const compressedSize = 0;

      const stats = calculateCompressionStats(originalSize, compressedSize);

      expect(stats.compressionRatio).toBe(0);
      expect(stats.reductionPercentage).toBe(100);
      expect(stats.savedBytes).toBe(1000);
    });

    it('同サイズの統計', () => {
      const originalSize = 1000;
      const compressedSize = 1000;

      const stats = calculateCompressionStats(originalSize, compressedSize);

      expect(stats.compressionRatio).toBe(1);
      expect(stats.reductionPercentage).toBe(0);
      expect(stats.savedBytes).toBe(0);
    });

    it('大きなファイルサイズでの精度', () => {
      const originalSize = 100 * 1024 * 1024; // 100MB
      const compressedSize = 10 * 1024 * 1024; // 10MB

      const stats = calculateCompressionStats(originalSize, compressedSize);

      expect(stats.compressionRatio).toBe(0.1);
      expect(stats.reductionPercentage).toBe(90);
      expect(stats.savedBytes).toBe(90 * 1024 * 1024);
    });
  });

  describe('パフォーマンス指標', () => {
    it('日本語フォント特有の圧縮率を検証', () => {
      // 典型的な日本語フォントのサイズ（実際のデータに基づく）
      const testCases = [
        {
          name: '小さなサブセット（ひらがな・カタカナ）',
          original: 15 * 1024 * 1024, // 15MB
          compressed: 500 * 1024, // 500KB
          expectedReduction: 96 // 96%削減
        },
        {
          name: '中サイズサブセット（常用漢字）',
          original: 15 * 1024 * 1024, // 15MB
          compressed: 3 * 1024 * 1024, // 3MB
          expectedReduction: 80 // 80%削減
        },
        {
          name: '大サイズサブセット（JIS第1-2水準）',
          original: 15 * 1024 * 1024, // 15MB
          compressed: 8 * 1024 * 1024, // 8MB
          expectedReduction: 46 // 46%削減
        }
      ];

      for (const testCase of testCases) {
        const stats = calculateCompressionStats(testCase.original, testCase.compressed);
        
        // 期待される削減率に近いか確認（±5%の許容）
        expect(stats.reductionPercentage).toBeGreaterThanOrEqual(testCase.expectedReduction - 5);
        expect(stats.reductionPercentage).toBeLessThanOrEqual(testCase.expectedReduction + 5);
      }
    });
  });
});