import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeVariableFont, subsetVariableFont, extractVariationAxes } from '../../src/main/services/variableFontProcessor';
import { analyzeFont } from '../../src/main/services/fontAnalyzer';
import { subsetFont } from '../../src/main/services/fontSubsetter';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('fontkit');
vi.mock('subset-font');

const mockFs = vi.mocked(fs);

describe('可変フォントテスト（Variable Font対応）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('可変フォントの検出と解析', () => {
    it('可変フォントを正しく識別する', async () => {
      const variableFontBuffer = Buffer.from('VARIABLE_FONT_DATA');
      mockFs.readFile.mockResolvedValue(variableFontBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'Roboto-Variable',
        fullName: 'Roboto Variable',
        numGlyphs: 2847,
        characterSet: new Set([65, 66, 67]), // A, B, C
        variationAxes: [
          { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400 },
          { tag: 'slnt', name: 'Slant', min: -12, max: 0, default: 0 },
          { tag: 'wdth', name: 'Width', min: 75, max: 100, default: 100 }
        ],
        namedInstances: [
          { name: 'Thin', coordinates: { wght: 100 } },
          { name: 'Regular', coordinates: { wght: 400 } },
          { name: 'Bold', coordinates: { wght: 700 } }
        ],
        isVariableFont: true
      } as any);

      const result = await analyzeVariableFont('/test/roboto-variable.ttf');

      expect(result.success).toBe(true);
      expect(result.isVariableFont).toBe(true);
      expect(result.variationAxes).toHaveLength(3);
      expect(result.variationAxes?.[0]).toEqual({
        tag: 'wght',
        name: 'Weight',
        min: 100,
        max: 900,
        default: 400
      });
      expect(result.namedInstances).toHaveLength(3);
      expect(result.namedInstances?.[0].name).toBe('Thin');
    });

    it('通常フォントと可変フォントを区別する', async () => {
      const staticFontBuffer = Buffer.from('STATIC_FONT_DATA');
      mockFs.readFile.mockResolvedValue(staticFontBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'Roboto-Regular',
        fullName: 'Roboto Regular',
        numGlyphs: 2847,
        characterSet: new Set([65, 66, 67]),
        variationAxes: [],
        namedInstances: [],
        isVariableFont: false
      } as any);

      const result = await analyzeVariableFont('/test/roboto-regular.ttf');

      expect(result.success).toBe(true);
      expect(result.isVariableFont).toBe(false);
      expect(result.variationAxes).toHaveLength(0);
      expect(result.namedInstances).toHaveLength(0);
    });

    it('標準的な可変フォント軸の解析', async () => {
      const standardAxes = [
        { tag: 'wght', name: 'Weight', min: 300, max: 800, default: 400 },
        { tag: 'wdth', name: 'Width', min: 75, max: 125, default: 100 },
        { tag: 'slnt', name: 'Slant', min: -15, max: 0, default: 0 },
        { tag: 'ital', name: 'Italic', min: 0, max: 1, default: 0 },
        { tag: 'opsz', name: 'Optical Size', min: 8, max: 72, default: 14 }
      ];

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'InterVariable',
        fullName: 'Inter Variable',
        numGlyphs: 3000,
        characterSet: new Set(Array.from({ length: 1000 }, (_, i) => i + 32)),
        variationAxes: standardAxes,
        isVariableFont: true
      } as any);

      const result = await extractVariationAxes('/test/inter-variable.ttf');

      expect(result.success).toBe(true);
      expect(result.axes).toHaveLength(5);
      
      // Weight軸の詳細確認
      const weightAxis = result.axes?.find(axis => axis.tag === 'wght');
      expect(weightAxis).toBeDefined();
      expect(weightAxis?.min).toBe(300);
      expect(weightAxis?.max).toBe(800);
      expect(weightAxis?.default).toBe(400);

      // Optical Size軸の確認
      const opszAxis = result.axes?.find(axis => axis.tag === 'opsz');
      expect(opszAxis).toBeDefined();
      expect(opszAxis?.name).toBe('Optical Size');
    });

    it('カスタム軸を持つ可変フォントの解析', async () => {
      const customAxes = [
        { tag: 'wght', name: 'Weight', min: 400, max: 700, default: 400 },
        { tag: 'GRAD', name: 'Grade', min: -200, max: 150, default: 0 },
        { tag: 'FILL', name: 'Fill', min: 0, max: 1, default: 0 },
        { tag: 'opsz', name: 'Optical Size', min: 20, max: 48, default: 24 }
      ];

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'MaterialSymbolsVariable',
        fullName: 'Material Symbols Variable',
        numGlyphs: 2500,
        characterSet: new Set(Array.from({ length: 2000 }, (_, i) => i + 0xE000)), // Private Use Area
        variationAxes: customAxes,
        isVariableFont: true
      } as any);

      const result = await extractVariationAxes('/test/material-symbols-variable.ttf');

      expect(result.success).toBe(true);
      expect(result.axes).toHaveLength(4);

      // カスタム軸の確認
      const gradAxis = result.axes?.find(axis => axis.tag === 'GRAD');
      expect(gradAxis).toBeDefined();
      expect(gradAxis?.name).toBe('Grade');
      expect(gradAxis?.min).toBe(-200);
      expect(gradAxis?.max).toBe(150);

      const fillAxis = result.axes?.find(axis => axis.tag === 'FILL');
      expect(fillAxis).toBeDefined();
      expect(fillAxis?.name).toBe('Fill');
    });
  });

  describe('可変フォントのサブセット化', () => {
    it('可変フォントの基本サブセット化', async () => {
      const inputBuffer = Buffer.from('VARIABLE_FONT_INPUT');
      const outputBuffer = Buffer.from('VARIABLE_FONT_OUTPUT');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/variable-subset.woff2',
        characters: 'abcdefghijklmnopqrstuvwxyz',
        outputFormat: 'woff2',
        preserveVariationAxes: true
      });

      expect(result.success).toBe(true);
      expect(result.outputSize).toBe(outputBuffer.length);
      expect(result.variationAxesPreserved).toBe(true);
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          text: 'abcdefghijklmnopqrstuvwxyz',
          preserveVariationTables: true
        })
      );
    });

    it('特定のインスタンスでの静的サブセット化', async () => {
      const inputBuffer = Buffer.from('VARIABLE_FONT_INPUT');
      const staticOutputBuffer = Buffer.from('STATIC_FONT_OUTPUT');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(staticOutputBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/static-subset.woff2',
        characters: 'Hello World',
        outputFormat: 'woff2',
        preserveVariationAxes: false,
        staticInstance: {
          wght: 600,
          wdth: 100,
          slnt: 0
        }
      });

      expect(result.success).toBe(true);
      expect(result.variationAxesPreserved).toBe(false);
      expect(result.staticInstanceUsed).toEqual({
        wght: 600,
        wdth: 100,
        slnt: 0
      });
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          text: 'Hello World',
          preserveVariationTables: false,
          instanceCoordinates: { wght: 600, wdth: 100, slnt: 0 }
        })
      );
    });

    it('軸の範囲制限を伴うサブセット化', async () => {
      const inputBuffer = Buffer.from('VARIABLE_FONT_INPUT');
      const limitedOutputBuffer = Buffer.from('LIMITED_VARIABLE_FONT_OUTPUT');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(limitedOutputBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/limited-subset.woff2',
        characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        axisLimits: {
          wght: { min: 400, max: 700 },
          wdth: { min: 90, max: 110 }
        }
      });

      expect(result.success).toBe(true);
      expect(result.variationAxesPreserved).toBe(true);
      expect(result.axisLimitsApplied).toEqual({
        wght: { min: 400, max: 700 },
        wdth: { min: 90, max: 110 }
      });
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          preserveVariationTables: true,
          axisLimits: {
            wght: { min: 400, max: 700 },
            wdth: { min: 90, max: 110 }
          }
        })
      );
    });

    it('名前付きインスタンスの保持', async () => {
      const inputBuffer = Buffer.from('VARIABLE_FONT_INPUT');
      const outputBuffer = Buffer.from('VARIABLE_FONT_WITH_INSTANCES');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/subset-with-instances.woff2',
        characters: 'あいうえおかきくけこ',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        preserveNamedInstances: ['Regular', 'Bold', 'Light']
      });

      expect(result.success).toBe(true);
      expect(result.preservedNamedInstances).toEqual(['Regular', 'Bold', 'Light']);
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          text: 'あいうえおかきくけこ',
          preserveVariationTables: true,
          preserveNamedInstances: ['Regular', 'Bold', 'Light']
        })
      );
    });
  });

  describe('可変フォントのサイズ最適化', () => {
    it('不要な軸の削除による最適化', async () => {
      const inputBuffer = Buffer.from('LARGE_VARIABLE_FONT');
      const optimizedBuffer = Buffer.from('OPTIMIZED_VARIABLE_FONT');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(optimizedBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/large-variable.ttf',
        outputPath: '/test/optimized-variable.woff2',
        characters: 'Hello World',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        removeUnusedAxes: ['slnt', 'ital'] // 使用しない軸を削除
      });

      expect(result.success).toBe(true);
      expect(result.removedAxes).toEqual(['slnt', 'ital']);
      expect(result.originalSize).toBe(inputBuffer.length);
      expect(result.outputSize).toBe(optimizedBuffer.length);
      expect(result.compressionRatio).toBeGreaterThan(0);
    });

    it('デルタテーブルの最適化', async () => {
      const inputBuffer = Buffer.from('VARIABLE_FONT_WITH_DELTAS');
      const optimizedBuffer = Buffer.from('OPTIMIZED_DELTAS');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(optimizedBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/optimized-deltas.woff2',
        characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        optimizeDeltaTables: true
      });

      expect(result.success).toBe(true);
      expect(result.deltasOptimized).toBe(true);
      expect(result.outputSize).toBeLessThan(inputBuffer.length);
    });

    it('軸値の量子化による最適化', async () => {
      const inputBuffer = Buffer.from('HIGH_PRECISION_VARIABLE_FONT');
      const quantizedBuffer = Buffer.from('QUANTIZED_VARIABLE_FONT');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(quantizedBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/high-precision-variable.ttf',
        outputPath: '/test/quantized-variable.woff2',
        characters: '0123456789',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        quantizeAxisValues: {
          wght: 25, // 25単位で量子化
          wdth: 5   // 5単位で量子化
        }
      });

      expect(result.success).toBe(true);
      expect(result.axisValuesQuantized).toEqual({
        wght: 25,
        wdth: 5
      });
    });
  });

  describe('可変フォントのエラーハンドリング', () => {
    it('無効な軸制限値のエラー処理', async () => {
      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'test',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        axisLimits: {
          wght: { min: 700, max: 400 } // 無効: min > max
        }
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_AXIS_LIMITS');
      expect(result.error?.message).toContain('軸の制限値が無効です');
      expect(result.error?.details?.invalidAxis).toBe('wght');
    });

    it('存在しない軸の指定エラー', async () => {
      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'TestVariable',
        variationAxes: [
          { tag: 'wght', name: 'Weight', min: 400, max: 700, default: 400 }
        ],
        isVariableFont: true
      } as any);

      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'test',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        staticInstance: {
          wght: 600,
          NONEXISTENT: 100 // 存在しない軸
        }
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_VARIATION_AXIS');
      expect(result.error?.message).toContain('存在しない可変軸');
      expect(result.error?.details?.unknownAxis).toBe('NONEXISTENT');
    });

    it('軸値範囲外のエラー処理', async () => {
      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'TestVariable',
        variationAxes: [
          { tag: 'wght', name: 'Weight', min: 300, max: 800, default: 400 }
        ],
        isVariableFont: true
      } as any);

      const result = await subsetVariableFont({
        inputPath: '/test/variable-font.ttf',
        outputPath: '/test/output.woff2',
        characters: 'test',
        outputFormat: 'woff2',
        preserveVariationAxes: false,
        staticInstance: {
          wght: 1000 // 範囲外の値
        }
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AXIS_VALUE_OUT_OF_RANGE');
      expect(result.error?.message).toContain('軸の値が範囲外');
      expect(result.error?.details?.axis).toBe('wght');
      expect(result.error?.details?.value).toBe(1000);
      expect(result.error?.details?.validRange).toEqual({ min: 300, max: 800 });
    });

    it('可変フォント処理ライブラリのエラー', async () => {
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('Variable font processing failed'));

      const result = await subsetVariableFont({
        inputPath: '/test/problematic-variable.ttf',
        outputPath: '/test/output.woff2',
        characters: 'test',
        outputFormat: 'woff2',
        preserveVariationAxes: true
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VARIABLE_FONT_PROCESSING_FAILED');
      expect(result.error?.message).toContain('可変フォントの処理に失敗');
    });
  });

  describe('日本語可変フォントの特殊処理', () => {
    it('日本語可変フォントのサブセット化', async () => {
      const inputBuffer = Buffer.from('JAPANESE_VARIABLE_FONT');
      const outputBuffer = Buffer.from('JAPANESE_VARIABLE_SUBSET');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const hiraganaKatakana = 'あいうえおかきくけこアイウエオカキクケコ';
      const basicKanji = '日本語文字漢字';

      const result = await subsetVariableFont({
        inputPath: '/test/noto-sans-jp-variable.ttf',
        outputPath: '/test/noto-sans-jp-subset.woff2',
        characters: hiraganaKatakana + basicKanji,
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        axisLimits: {
          wght: { min: 300, max: 700 }
        }
      });

      expect(result.success).toBe(true);
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          text: hiraganaKatakana + basicKanji,
          preserveVariationTables: true
        })
      );
    });

    it('OpenType機能の保持（日本語組版）', async () => {
      const inputBuffer = Buffer.from('JAPANESE_VARIABLE_WITH_FEATURES');
      const outputBuffer = Buffer.from('JAPANESE_SUBSET_WITH_FEATURES');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/japanese-variable.ttf',
        outputPath: '/test/japanese-subset.woff2',
        characters: 'こんにちは世界',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        preserveOpenTypeFeatures: ['palt', 'kern', 'liga', 'calt'] // 日本語組版に重要な機能
      });

      expect(result.success).toBe(true);
      expect(result.preservedFeatures).toEqual(['palt', 'kern', 'liga', 'calt']);
    });

    it('縦書き対応の可変フォント処理', async () => {
      const inputBuffer = Buffer.from('VERTICAL_JAPANESE_VARIABLE');
      const outputBuffer = Buffer.from('VERTICAL_JAPANESE_SUBSET');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/vertical-japanese-variable.ttf',
        outputPath: '/test/vertical-subset.woff2',
        characters: '縦書き文字列テスト',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        preserveOpenTypeFeatures: ['vert', 'vrt2', 'vpal', 'vkrn'], // 縦書き関連機能
        verticalMetrics: true
      });

      expect(result.success).toBe(true);
      expect(result.verticalMetricsPreserved).toBe(true);
    });
  });

  describe('可変フォントのメタデータ処理', () => {
    it('可変フォントの詳細情報取得', async () => {
      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'InterVariable',
        fullName: 'Inter Variable',
        familyName: 'Inter',
        subfamilyName: 'Regular',
        version: '3.19',
        numGlyphs: 2847,
        characterSet: new Set(Array.from({ length: 2000 }, (_, i) => i + 32)),
        variationAxes: [
          { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400 },
          { tag: 'slnt', name: 'Slant', min: -10, max: 0, default: 0 }
        ],
        namedInstances: [
          { name: 'Thin', coordinates: { wght: 100 } },
          { name: 'ExtraLight', coordinates: { wght: 200 } },
          { name: 'Light', coordinates: { wght: 300 } },
          { name: 'Regular', coordinates: { wght: 400 } },
          { name: 'Medium', coordinates: { wght: 500 } },
          { name: 'SemiBold', coordinates: { wght: 600 } },
          { name: 'Bold', coordinates: { wght: 700 } },
          { name: 'ExtraBold', coordinates: { wght: 800 } },
          { name: 'Black', coordinates: { wght: 900 } }
        ],
        isVariableFont: true,
        variableAxesCount: 2,
        namedInstancesCount: 9
      } as any);

      const result = await analyzeVariableFont('/test/inter-variable.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.familyName).toBe('Inter');
      expect(result.fontInfo?.version).toBe('3.19');
      expect(result.variableAxesCount).toBe(2);
      expect(result.namedInstancesCount).toBe(9);
      expect(result.variationAxes).toHaveLength(2);
      expect(result.namedInstances).toHaveLength(9);
    });

    it('可変フォントのデザインスペース分析', async () => {
      const result = await analyzeVariableFont('/test/multi-axis-variable.ttf');

      if (result.success) {
        const designSpace = {
          totalAxes: result.variationAxes?.length || 0,
          designSpaceSize: result.variationAxes?.reduce((size, axis) => {
            return size * (axis.max - axis.min + 1);
          }, 1) || 0,
          interpolationComplexity: result.variationAxes?.length ? 
            Math.pow(2, result.variationAxes.length) : 0
        };

        expect(designSpace.totalAxes).toBeGreaterThan(0);
        expect(designSpace.designSpaceSize).toBeGreaterThan(0);
        expect(designSpace.interpolationComplexity).toBeGreaterThan(0);
      }
    });

    it('可変フォントのライセンス情報保持', async () => {
      const inputBuffer = Buffer.from('VARIABLE_FONT_WITH_LICENSE');
      const outputBuffer = Buffer.from('SUBSET_WITH_LICENSE');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetVariableFont({
        inputPath: '/test/licensed-variable.ttf',
        outputPath: '/test/licensed-subset.woff2',
        characters: 'Licensed Font',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        preserveLicenseInfo: true
      });

      expect(result.success).toBe(true);
      expect(result.licenseInfoPreserved).toBe(true);
    });
  });

  describe('パフォーマンスとメモリ効率', () => {
    it('大きな可変フォントのメモリ効率的処理', async () => {
      const largeFontBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      const optimizedBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB

      mockFs.readFile.mockResolvedValue(largeFontBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(optimizedBuffer);

      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      const result = await subsetVariableFont({
        inputPath: '/test/large-variable-font.ttf',
        outputPath: '/test/optimized-subset.woff2',
        characters: 'Hello World',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        memoryOptimized: true
      });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      const processingTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(15000); // 15秒以内
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB以内
      expect(result.compressionRatio).toBeGreaterThan(5); // 5倍以上の圧縮
    });

    it('複数軸を持つ可変フォントの処理時間', async () => {
      const multiAxisBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      const subsetBuffer = Buffer.alloc(1.5 * 1024 * 1024); // 1.5MB

      mockFs.readFile.mockResolvedValue(multiAxisBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(subsetBuffer);

      const startTime = Date.now();

      const result = await subsetVariableFont({
        inputPath: '/test/multi-axis-variable.ttf',
        outputPath: '/test/multi-axis-subset.woff2',
        characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        outputFormat: 'woff2',
        preserveVariationAxes: true,
        axisLimits: {
          wght: { min: 300, max: 800 },
          wdth: { min: 75, max: 125 },
          slnt: { min: -10, max: 0 },
          opsz: { min: 14, max: 72 }
        }
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(12000); // 12秒以内
      expect(result.axisLimitsApplied).toBeDefined();
    });
  });
});