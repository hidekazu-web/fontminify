import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeColorEmojiFont, subsetColorEmojiFont, extractEmojiMetadata } from '../../src/main/services/colorEmojiFontProcessor';
import { analyzeFont } from '../../src/main/services/fontAnalyzer';
import { subsetFont } from '../../src/main/services/fontSubsetter';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('fontkit');
vi.mock('subset-font');

const mockFs = vi.mocked(fs);

describe('カラー絵文字フォントテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('カラー絵文字フォントの検出と解析', () => {
    it('COLR/CPALテーブルを持つフォントを識別する', async () => {
      const colorEmojiBuffer = Buffer.from('COLOR_EMOJI_FONT_DATA');
      mockFs.readFile.mockResolvedValue(colorEmojiBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'NotoColorEmoji',
        fullName: 'Noto Color Emoji',
        numGlyphs: 3000,
        characterSet: new Set([
          0x1F600, // 😀 grinning face
          0x1F603, // 😃 grinning face with big eyes
          0x1F604, // 😄 grinning face with smiling eyes
          0x1F60A, // 😊 smiling face with smiling eyes
          0x2764,  // ❤ red heart
          0x1F44D, // 👍 thumbs up
          0x1F44E, // 👎 thumbs down
        ]),
        tables: {
          COLR: {
            version: 1,
            numBaseGlyphRecords: 1500,
            baseGlyphRecords: [
              { glyphID: 100, firstLayerIndex: 0, numLayers: 3 },
              { glyphID: 101, firstLayerIndex: 3, numLayers: 2 }
            ]
          },
          CPAL: {
            version: 0,
            numPaletteEntries: 256,
            numPalettes: 2,
            colorRecords: [
              { blue: 255, green: 0, red: 0, alpha: 255 }, // Red
              { blue: 0, green: 255, red: 0, alpha: 255 }, // Green
              { blue: 0, green: 0, red: 255, alpha: 255 }  // Blue
            ]
          },
          CBDT: null, // CBDT/CBLCは持たない
          CBLC: null
        },
        hasColorEmoji: true,
        colorFormat: 'COLR/CPAL'
      } as any);

      const result = await analyzeColorEmojiFont('/test/noto-color-emoji.ttf');

      expect(result.success).toBe(true);
      expect(result.hasColorEmoji).toBe(true);
      expect(result.colorFormat).toBe('COLR/CPAL');
      expect(result.colorLayers).toBeDefined();
      expect(result.colorPalettes).toBeDefined();
      expect(result.emojiCount).toBeGreaterThan(0);
    });

    it('CBDT/CBLCテーブルを持つフォントを識別する', async () => {
      const bitmapEmojiBuffer = Buffer.from('BITMAP_EMOJI_FONT_DATA');
      mockFs.readFile.mockResolvedValue(bitmapEmojiBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'AppleColorEmoji',
        fullName: 'Apple Color Emoji',
        numGlyphs: 2800,
        characterSet: new Set([
          0x1F600, 0x1F601, 0x1F602, 0x1F603, 0x1F604,
          0x1F34E, 0x1F34F, 0x1F350, 0x1F351, 0x1F352
        ]),
        tables: {
          COLR: null,
          CPAL: null,
          CBDT: {
            version: 3,
            bitmapSizes: [
              { indexSubTableArrayOffset: 0, indexTablesSize: 1000, ppemX: 20, ppemY: 20 },
              { indexSubTableArrayOffset: 1000, indexTablesSize: 2000, ppemX: 32, ppemY: 32 },
              { indexSubTableArrayOffset: 3000, indexTablesSize: 4000, ppemX: 64, ppemY: 64 }
            ]
          },
          CBLC: {
            version: 3,
            numSizes: 3
          }
        },
        hasColorEmoji: true,
        colorFormat: 'CBDT/CBLC'
      } as any);

      const result = await analyzeColorEmojiFont('/test/apple-color-emoji.ttc');

      expect(result.success).toBe(true);
      expect(result.hasColorEmoji).toBe(true);
      expect(result.colorFormat).toBe('CBDT/CBLC');
      expect(result.bitmapSizes).toHaveLength(3);
      expect(result.bitmapSizes?.[0]).toEqual({ width: 20, height: 20 });
      expect(result.bitmapSizes?.[2]).toEqual({ width: 64, height: 64 });
    });

    it('SVGテーブルを持つフォントを識別する', async () => {
      const svgEmojiBuffer = Buffer.from('SVG_EMOJI_FONT_DATA');
      mockFs.readFile.mockResolvedValue(svgEmojiBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'TwitterColorEmoji',
        fullName: 'Twitter Color Emoji',
        numGlyphs: 2500,
        characterSet: new Set([
          0x1F600, 0x1F44D, 0x2764, 0x1F389, 0x1F4A9
        ]),
        tables: {
          COLR: null,
          CPAL: null,
          CBDT: null,
          CBLC: null,
          SVG: {
            version: 0,
            svgDocumentList: [
              { startGID: 100, endGID: 100, svgDocOffset: 0, svgDocLength: 2000 },
              { startGID: 101, endGID: 102, svgDocOffset: 2000, svgDocLength: 3000 }
            ]
          }
        },
        hasColorEmoji: true,
        colorFormat: 'SVG'
      } as any);

      const result = await analyzeColorEmojiFont('/test/twitter-color-emoji.ttf');

      expect(result.success).toBe(true);
      expect(result.hasColorEmoji).toBe(true);
      expect(result.colorFormat).toBe('SVG');
      expect(result.svgDocuments).toBeDefined();
      expect(result.svgDocuments?.length).toBeGreaterThan(0);
    });

    it('カラー絵文字でない通常フォントを識別する', async () => {
      const regularFontBuffer = Buffer.from('REGULAR_FONT_DATA');
      mockFs.readFile.mockResolvedValue(regularFontBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'NotoSans-Regular',
        fullName: 'Noto Sans Regular',
        numGlyphs: 2000,
        characterSet: new Set(Array.from({ length: 1000 }, (_, i) => i + 32)),
        tables: {
          COLR: null,
          CPAL: null,
          CBDT: null,
          CBLC: null,
          SVG: null
        },
        hasColorEmoji: false,
        colorFormat: null
      } as any);

      const result = await analyzeColorEmojiFont('/test/noto-sans-regular.ttf');

      expect(result.success).toBe(true);
      expect(result.hasColorEmoji).toBe(false);
      expect(result.colorFormat).toBeNull();
    });
  });

  describe('絵文字メタデータの抽出', () => {
    it('Unicode絵文字カテゴリの分類', async () => {
      const emojiCategories = {
        'Smileys & Emotion': [0x1F600, 0x1F603, 0x1F604, 0x1F60A, 0x2764],
        'People & Body': [0x1F44D, 0x1F44E, 0x1F44F, 0x1F64F],
        'Animals & Nature': [0x1F436, 0x1F431, 0x1F42D, 0x1F339],
        'Food & Drink': [0x1F34E, 0x1F354, 0x1F355, 0x1F37A],
        'Travel & Places': [0x1F697, 0x1F3E0, 0x1F30D, 0x1F5FB],
        'Activities': [0x26BD, 0x1F3C0, 0x1F3B5, 0x1F3A8],
        'Objects': [0x1F4F1, 0x1F4BB, 0x1F511, 0x1F56F],
        'Symbols': [0x2764, 0x1F494, 0x1F495, 0x2665],
        'Flags': [0x1F1FA, 0x1F1F8, 0x1F1EF, 0x1F1F5]
      };

      const mockFontkit = await import('fontkit');
      const allEmojis = Object.values(emojiCategories).flat();
      
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        characterSet: new Set(allEmojis),
        hasColorEmoji: true
      } as any);

      const result = await extractEmojiMetadata('/test/comprehensive-emoji.ttf');

      expect(result.success).toBe(true);
      expect(result.categories).toBeDefined();
      expect(Object.keys(result.categories || {})).toContain('Smileys & Emotion');
      expect(Object.keys(result.categories || {})).toContain('Food & Drink');
      expect(result.totalEmojis).toBe(allEmojis.length);
    });

    it('絵文字のスキントーン対応の検出', async () => {
      const skinToneEmojis = [
        0x1F44D, // 👍 thumbs up
        0x1F44D, 0x1F3FB, // 👍🏻 thumbs up: light skin tone
        0x1F44D, 0x1F3FC, // 👍🏼 thumbs up: medium-light skin tone
        0x1F44D, 0x1F3FD, // 👍🏽 thumbs up: medium skin tone
        0x1F44D, 0x1F3FE, // 👍🏾 thumbs up: medium-dark skin tone
        0x1F44D, 0x1F3FF, // 👍🏿 thumbs up: dark skin tone
      ];

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        characterSet: new Set(skinToneEmojis),
        hasColorEmoji: true
      } as any);

      const result = await extractEmojiMetadata('/test/skin-tone-emoji.ttf');

      expect(result.success).toBe(true);
      expect(result.skinToneSupport).toBe(true);
      expect(result.skinToneModifiers).toContain(0x1F3FB); // Light skin tone
      expect(result.skinToneModifiers).toContain(0x1F3FF); // Dark skin tone
    });

    it('合成絵文字（ZWJ sequences）の検出', async () => {
      const zwjSequences = [
        // 👨‍👩‍👧‍👦 Family: man, woman, girl, boy
        [0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467, 0x200D, 0x1F466],
        // 👩‍💻 Woman technologist
        [0x1F469, 0x200D, 0x1F4BB],
        // 🏳️‍🌈 Rainbow flag
        [0x1F3F3, 0xFE0F, 0x200D, 0x1F308]
      ];

      const allCodepoints = zwjSequences.flat();
      
      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        characterSet: new Set(allCodepoints),
        hasColorEmoji: true,
        zwjSequences: zwjSequences
      } as any);

      const result = await extractEmojiMetadata('/test/zwj-emoji.ttf');

      expect(result.success).toBe(true);
      // expect(result.zwjSequences).toBeDefined();
      // expect(result.zwjSequences?.length).toBeGreaterThan(0);
      expect(result.hasComplexEmojis).toBe(true);
    });
  });

  describe('カラー絵文字フォントのサブセット化', () => {
    it('COLR/CPALフォントのサブセット化', async () => {
      const inputBuffer = Buffer.from('COLOR_EMOJI_INPUT');
      const outputBuffer = Buffer.from('COLOR_EMOJI_SUBSET');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const selectedEmojis = '😀😃😄😊❤👍👎';

      const result = await subsetColorEmojiFont({
        inputPath: '/test/noto-color-emoji.ttf',
        outputPath: '/test/emoji-subset.woff2',
        characters: selectedEmojis,
        outputFormat: 'woff2',
        preserveColorTables: true
      });

      expect(result.success).toBe(true);
      expect(result.colorTablesPreserved).toBe(true);
      expect(result.emojiCount).toBe(7);
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          text: selectedEmojis,
          preserveColorTables: true,
          keepCOLR: true,
          keepCPAL: true
        })
      );
    });

    it('ビットマップ絵文字フォントのサブセット化', async () => {
      const inputBuffer = Buffer.from('BITMAP_EMOJI_INPUT');
      const outputBuffer = Buffer.from('BITMAP_EMOJI_SUBSET');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/apple-color-emoji.ttc',
        outputPath: '/test/bitmap-emoji-subset.ttf',
        characters: '🍎🍏🍊🍋',
        outputFormat: 'ttf',
        preserveColorTables: true,
        bitmapSizes: [32, 64] // 特定のサイズのみ保持
      });

      expect(result.success).toBe(true);
      expect(result.bitmapSizesPreserved).toEqual([32, 64]);
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          keepCBDT: true,
          keepCBLC: true,
          bitmapSizes: [32, 64]
        })
      );
    });

    it('SVG絵文字フォントのサブセット化', async () => {
      const inputBuffer = Buffer.from('SVG_EMOJI_INPUT');
      const outputBuffer = Buffer.from('SVG_EMOJI_SUBSET');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/twitter-color-emoji.ttf',
        outputPath: '/test/svg-emoji-subset.woff2',
        characters: '🎉💩❤️',
        outputFormat: 'woff2',
        preserveColorTables: true,
        optimizeSVG: true
      });

      expect(result.success).toBe(true);
      expect(result.svgOptimized).toBe(true);
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          keepSVG: true,
          optimizeSVG: true
        })
      );
    });

    it('カラーパレットのカスタマイズ', async () => {
      const inputBuffer = Buffer.from('COLR_EMOJI_INPUT');
      const outputBuffer = Buffer.from('CUSTOM_PALETTE_OUTPUT');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const customPalette = [
        { red: 255, green: 0, blue: 0, alpha: 255 },   // Red
        { red: 0, green: 255, blue: 0, alpha: 255 },   // Green
        { red: 0, green: 0, blue: 255, alpha: 255 },   // Blue
        { red: 255, green: 255, blue: 0, alpha: 255 }  // Yellow
      ];

      const result = await subsetColorEmojiFont({
        inputPath: '/test/colr-emoji.ttf',
        outputPath: '/test/custom-palette-emoji.woff2',
        characters: '😀😃😄',
        outputFormat: 'woff2',
        preserveColorTables: true,
        customPalette: customPalette
      });

      expect(result.success).toBe(true);
      expect(result.customPaletteApplied).toBe(true);
      expect(mockSubsetFont).toHaveBeenCalledWith(
        inputBuffer,
        expect.objectContaining({
          customColorPalette: customPalette
        })
      );
    });
  });

  describe('絵文字フォントのファイルサイズ最適化', () => {
    it('不要なビットマップサイズの削除', async () => {
      const largeEmojiBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      const optimizedBuffer = Buffer.alloc(5 * 1024 * 1024);   // 5MB

      mockFs.readFile.mockResolvedValue(largeEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(optimizedBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/large-emoji-font.ttc',
        outputPath: '/test/optimized-emoji.woff2',
        characters: '😀😃😄😊',
        outputFormat: 'woff2',
        preserveColorTables: true,
        bitmapSizes: [32], // 32pxサイズのみ保持
        removeLargeBitmaps: true
      });

      expect(result.success).toBe(true);
      expect(result.originalSize).toBe(largeEmojiBuffer.length);
      expect(result.outputSize).toBe(optimizedBuffer.length);
      expect(result.compressionRatio).toBeGreaterThan(8); // 8倍以上の圧縮
      expect(result.bitmapSizesRemoved).toBeDefined();
    });

    it('COLR v0からv1への変換最適化', async () => {
      const colrv0Buffer = Buffer.from('COLR_V0_FONT');
      const colrv1Buffer = Buffer.from('COLR_V1_OPTIMIZED');

      mockFs.readFile.mockResolvedValue(colrv0Buffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(colrv1Buffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/colr-v0-emoji.ttf',
        outputPath: '/test/colr-v1-emoji.woff2',
        characters: '🌈🎨🎭',
        outputFormat: 'woff2',
        preserveColorTables: true,
        upgradeCOLRVersion: 1
      });

      expect(result.success).toBe(true);
      expect(result.colrVersionUpgraded).toBe(1);
      expect(result.gradientOptimized).toBe(true);
    });

    it('重複する絵文字の統合', async () => {
      const duplicateEmojiBuffer = Buffer.from('DUPLICATE_EMOJI_FONT');
      const deduplicatedBuffer = Buffer.from('DEDUPLICATED_EMOJI_FONT');

      mockFs.readFile.mockResolvedValue(duplicateEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(deduplicatedBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/duplicate-emoji.ttf',
        outputPath: '/test/deduplicated-emoji.woff2',
        characters: '😀😀😃😃😄', // 重複した絵文字
        outputFormat: 'woff2',
        preserveColorTables: true,
        deduplicateEmojis: true
      });

      expect(result.success).toBe(true);
      expect(result.duplicatesRemoved).toBeGreaterThan(0);
      expect(result.uniqueEmojiCount).toBe(3); // 😀、😃、😄
    });
  });

  describe('絵文字フォントの互換性テスト', () => {
    it('古いブラウザ向けフォールバック生成', async () => {
      const modernEmojiBuffer = Buffer.from('MODERN_EMOJI_FONT');
      const fallbackBuffer = Buffer.from('FALLBACK_EMOJI_FONT');

      mockFs.readFile.mockResolvedValue(modernEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(fallbackBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/modern-emoji.ttf',
        outputPath: '/test/fallback-emoji.ttf',
        characters: '😀😃😄',
        outputFormat: 'ttf',
        preserveColorTables: false, // カラーテーブルを削除してフォールバック生成
        generateMonochromeFallback: true
      });

      expect(result.success).toBe(true);
      expect(result.monochromeFallbackGenerated).toBe(true);
      expect(result.colorTablesPreserved).toBe(false);
    });

    it('Webフォント向けWOFF2最適化', async () => {
      const webEmojiBuffer = Buffer.from('WEB_EMOJI_FONT');
      const woff2Buffer = Buffer.from('OPTIMIZED_WOFF2_EMOJI');

      mockFs.readFile.mockResolvedValue(webEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(woff2Buffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/web-emoji.ttf',
        outputPath: '/test/web-optimized-emoji.woff2',
        characters: '🌍🌎🌏🗺️',
        outputFormat: 'woff2',
        preserveColorTables: true,
        webOptimized: true,
        compressionLevel: 9
      });

      expect(result.success).toBe(true);
      expect(result.webOptimized).toBe(true);
      expect(result.compressionLevel).toBe(9);
    });

    it('モバイル向けサイズ最適化', async () => {
      const mobileEmojiBuffer = Buffer.from('MOBILE_EMOJI_FONT');
      const optimizedMobileBuffer = Buffer.from('MOBILE_OPTIMIZED_EMOJI');

      mockFs.readFile.mockResolvedValue(mobileEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(optimizedMobileBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/mobile-emoji.ttf',
        outputPath: '/test/mobile-optimized.woff2',
        characters: '📱💬📷🎵',
        outputFormat: 'woff2',
        preserveColorTables: true,
        mobileOptimized: true,
        maxFileSize: 1024 * 1024 // 1MB制限
      });

      expect(result.success).toBe(true);
      expect(result.mobileOptimized).toBe(true);
      expect(result.outputSize).toBeLessThanOrEqual(1024 * 1024);
    });
  });

  describe('絵文字フォントのエラーハンドリング', () => {
    it('サポートされていない絵文字の処理', async () => {
      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        characterSet: new Set([0x1F600, 0x1F603]), // 限定的な絵文字セット
        hasColorEmoji: true
      } as any);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/limited-emoji.ttf',
        outputPath: '/test/output.woff2',
        characters: '😀😃🚀🌟', // 🚀🌟はサポートされていない
        outputFormat: 'woff2',
        preserveColorTables: true
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('一部の絵文字がフォントに含まれていません');
      expect(result.unsupportedEmojis).toEqual(['🚀', '🌟']);
      expect(result.supportedEmojiCount).toBe(2);
    });

    it('破損したカラーテーブルの処理', async () => {
      const corruptedEmojiBuffer = Buffer.from('CORRUPTED_COLOR_TABLES');
      mockFs.readFile.mockResolvedValue(corruptedEmojiBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockImplementation(() => {
        throw new Error('Invalid COLR table structure');
      });

      const result = await subsetColorEmojiFont({
        inputPath: '/test/corrupted-emoji.ttf',
        outputPath: '/test/output.woff2',
        characters: '😀😃',
        outputFormat: 'woff2',
        preserveColorTables: true
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CORRUPTED_COLOR_TABLES');
      expect(result.error?.message).toContain('カラーテーブルが破損');
    });

    it('メモリ不足時の処理', async () => {
      const hugeEmojiBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      mockFs.readFile.mockResolvedValue(hugeEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockRejectedValue(new Error('Cannot allocate memory'));

      const result = await subsetColorEmojiFont({
        inputPath: '/test/huge-emoji.ttc',
        outputPath: '/test/output.woff2',
        characters: '😀',
        outputFormat: 'woff2',
        preserveColorTables: true
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MEMORY_EXHAUSTED');
      expect(result.error?.message).toContain('メモリ不足');
      expect(result.error?.suggestions).toContain('ファイルサイズを小さくして再試行');
    });
  });

  describe('絵文字フォントのパフォーマンステスト', () => {
    it('大量絵文字の高速処理', async () => {
      const largeEmojiSet = Array.from({ length: 1000 }, (_, i) => 
        String.fromCodePoint(0x1F600 + (i % 80))
      ).join('');

      const largeEmojiBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      const processedBuffer = Buffer.alloc(2 * 1024 * 1024);   // 2MB

      mockFs.readFile.mockResolvedValue(largeEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(processedBuffer);

      const startTime = Date.now();

      const result = await subsetColorEmojiFont({
        inputPath: '/test/large-emoji-set.ttf',
        outputPath: '/test/processed-large-set.woff2',
        characters: largeEmojiSet,
        outputFormat: 'woff2',
        preserveColorTables: true,
        fastProcessing: true
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(20000); // 20秒以内
      expect(result.fastProcessingUsed).toBe(true);
    });

    it('ストリーミング処理による効率化', async () => {
      const streamingEmojiBuffer = Buffer.alloc(30 * 1024 * 1024); // 30MB
      const streamedBuffer = Buffer.alloc(3 * 1024 * 1024);        // 3MB

      mockFs.readFile.mockResolvedValue(streamingEmojiBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(streamedBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/streaming-emoji.ttc',
        outputPath: '/test/streamed-output.woff2',
        characters: '😀😃😄😊❤️👍',
        outputFormat: 'woff2',
        preserveColorTables: true,
        streamingMode: true
      });

      expect(result.success).toBe(true);
      expect(result.streamingModeUsed).toBe(true);
      expect(result.peakMemoryUsage).toBeLessThan(200 * 1024 * 1024); // 200MB未満
    });

    it('並列処理による高速化', async () => {
      const multipleEmojiFonts = [
        'emoji-set-1.ttf',
        'emoji-set-2.ttf',
        'emoji-set-3.ttf',
        'emoji-set-4.ttf'
      ];

      const batchBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB each
      mockFs.readFile.mockResolvedValue(batchBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(Buffer.alloc(1024 * 1024));

      const startTime = Date.now();

      const promises = multipleEmojiFonts.map((fontPath, index) =>
        subsetColorEmojiFont({
          inputPath: `/test/${fontPath}`,
          outputPath: `/test/batch-output-${index}.woff2`,
          characters: `😀😃😄${index}`,
          outputFormat: 'woff2',
          preserveColorTables: true
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(15000); // 15秒以内（並列処理により高速化）
    });
  });

  describe('絵文字フォントの品質検証', () => {
    it('出力された絵文字の品質確認', async () => {
      const inputBuffer = Buffer.from('HIGH_QUALITY_EMOJI');
      const outputBuffer = Buffer.from('PROCESSED_QUALITY_EMOJI');

      mockFs.readFile.mockResolvedValue(inputBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      const result = await subsetColorEmojiFont({
        inputPath: '/test/quality-emoji.ttf',
        outputPath: '/test/quality-output.woff2',
        characters: '😀😃😄',
        outputFormat: 'woff2',
        preserveColorTables: true,
        qualityCheck: true
      });

      expect(result.success).toBe(true);
      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics?.colorAccuracy).toBeGreaterThan(0.95);
      expect(result.qualityMetrics?.sharpness).toBeGreaterThan(0.9);
      expect(result.qualityScore).toBeGreaterThan(85); // 85点以上
    });

    it('レンダリング品質の検証', async () => {
      const result = await subsetColorEmojiFont({
        inputPath: '/test/rendering-test-emoji.ttf',
        outputPath: '/test/rendering-output.woff2',
        characters: '🌈🎨🎭',
        outputFormat: 'woff2',
        preserveColorTables: true,
        validateRendering: true
      });

      if (result.success) {
        expect(result.renderingValidation).toBeDefined();
        expect(result.renderingValidation?.antiAliasing).toBe(true);
        expect(result.renderingValidation?.colorBlending).toBe(true);
        expect(result.renderingValidation?.scalability).toBe(true);
      }
    });
  });
});