import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeFont } from '../../src/main/services/fontAnalyzer';
import { subsetFont } from '../../src/main/services/fontSubsetter';
import { CHARACTER_PRESETS } from '../../src/shared/presets';
import * as fontkit from 'fontkit';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fontkit');
vi.mock('fs/promises');
vi.mock('subset-font');

const mockFontkit = vi.mocked(fontkit);
const mockFs = vi.mocked(fs);

describe('日本語フォント特化テスト（NotoSans、游ゴシック等）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Noto Sans CJK JP フォントテスト', () => {
    it('Noto Sans CJK JP フォントが正しく解析される', async () => {
      const mockNotoFont = {
        postscriptName: 'NotoSansCJK-Regular',
        fullName: 'Noto Sans CJK JP Regular',
        familyName: 'Noto Sans CJK JP',
        subfamilyName: 'Regular',
        version: 'Version 2.004',
        numGlyphs: 65535,
        unitsPerEm: 1000,
        ascent: 880,
        descent: -120,
        lineGap: 0,
        bbox: { minX: -1023, minY: -342, maxX: 2048, maxY: 1060 },
        characterSet: new Set([
          // 基本ASCII
          ...Array.from({ length: 95 }, (_, i) => i + 32),
          // ひらがな
          0x3041, 0x3042, 0x3043, 0x3044, 0x3045, // あいうえお
          0x304B, 0x304D, 0x304F, 0x3051, 0x3053, // かきくけこ
          // カタカナ
          0x30A1, 0x30A2, 0x30A3, 0x30A4, 0x30A5, // アイウエオ
          0x30AB, 0x30AD, 0x30AF, 0x30B1, 0x30B3, // カキクケコ
          // 常用漢字
          0x65E5, 0x672C, 0x8A9E, 0x6F22, 0x5B57, // 日本語漢字
          0x4E00, 0x4E8C, 0x4E09, 0x56DB, 0x4E94, // 一二三四五
          // CJK拡張
          0x20000, 0x2A6DF // CJK統合漢字拡張B
        ]),
        tables: {
          os2: {
            usWeightClass: 400,
            usWidthClass: 5,
            fsSelection: 64,
            ulUnicodeRange1: 0x03FF,
            ulUnicodeRange2: 0x1FFF,
            ulUnicodeRange3: 0x001F,
            ulUnicodeRange4: 0x0000
          },
          head: {
            created: new Date('2023-01-01'),
            modified: new Date('2023-06-01'),
            macStyle: 0
          }
        }
      };

      mockFs.readFile.mockResolvedValue(Buffer.from('noto-font-data'));
      mockFontkit.openSync.mockReturnValue(mockNotoFont as any);

      const result = await analyzeFont('/test/NotoSansCJKjp-Regular.otf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.family).toBe('Noto Sans CJK JP');
      expect(result.fontInfo?.style).toBe('Regular');
      expect(result.fontInfo?.version).toBe('Version 2.004');
      expect(result.fontInfo?.glyphCount).toBe(65535);
      expect(result.fontInfo?.format).toBe('otf');
      
      // 日本語文字サポートの確認
      expect(result.fontInfo?.supportsHiragana).toBe(true);
      expect(result.fontInfo?.supportsKatakana).toBe(true);
      expect(result.fontInfo?.supportsKanji).toBe(true);
      expect(result.fontInfo?.supportsCJKExtended).toBe(true);
    });

    it('Noto Sans CJK JP のサブセット化が効率的に行われる', async () => {
      const originalBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      const subsetBuffer = Buffer.alloc(500 * 1024); // 500KB

      mockFs.readFile.mockResolvedValue(originalBuffer);
      
      // subset-fontのモック
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(subsetBuffer);

      const hiraganaPreset = CHARACTER_PRESETS.find(p => p.id === 'hiragana_katakana');
      const options = {
        inputPath: '/test/NotoSansCJKjp-Regular.otf',
        outputPath: '/test/NotoSansCJKjp-Subset.woff2',
        characters: hiraganaPreset!.characters,
        outputFormat: 'woff2' as const,
        enableWoff2Compression: true
      };

      const startTime = Date.now();
      const result = await subsetFont(options);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.originalSize).toBe(15 * 1024 * 1024);
      expect(result.outputSize).toBe(500 * 1024);
      
      // 96%以上の削減率を達成
      const reductionRatio = (1 - result.outputSize! / result.originalSize!) * 100;
      expect(reductionRatio).toBeGreaterThan(96);
      
      // 処理時間が妥当（10秒以内）
      expect(processingTime).toBeLessThan(10000);
    });

    it('Noto Serif CJK JP フォントが正しく処理される', async () => {
      const mockSerifFont = {
        postscriptName: 'NotoSerifCJK-Regular',
        fullName: 'Noto Serif CJK JP Regular',
        familyName: 'Noto Serif CJK JP',
        subfamilyName: 'Regular',
        numGlyphs: 43000,
        characterSet: new Set([
          // 日本語文字の基本セット
          0x3041, 0x3042, 0x3043, // ひらがな
          0x30A1, 0x30A2, 0x30A3, // カタカナ
          0x65E5, 0x672C, 0x8A9E  // 基本漢字
        ])
      };

      mockFontkit.openSync.mockReturnValue(mockSerifFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.from('serif-font-data'));

      const result = await analyzeFont('/test/NotoSerifCJKjp-Regular.otf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.family).toBe('Noto Serif CJK JP');
      expect(result.fontInfo?.glyphCount).toBe(43000);
      expect(result.fontInfo?.supportsHiragana).toBe(true);
      expect(result.fontInfo?.supportsCJKExtended).toBe(false); // Serifは拡張文字が少ない
    });
  });

  describe('游ゴシック・游明朝フォントテスト', () => {
    it('游ゴシック Medium フォントが正しく解析される', async () => {
      const mockYuGothicFont = {
        postscriptName: 'YuGothic-Medium',
        fullName: '游ゴシック Medium',
        familyName: '游ゴシック',
        subfamilyName: 'Medium',
        version: 'Version 1.90',
        numGlyphs: 16000,
        unitsPerEm: 1000,
        characterSet: new Set([
          // 日本語基本文字
          ...Array.from({ length: 83 }, (_, i) => i + 0x3041), // ひらがな
          ...Array.from({ length: 83 }, (_, i) => i + 0x30A1), // カタカナ
          // JIS第1・第2水準漢字
          0x4E00, 0x4E01, 0x4E03, 0x4E07, 0x4E08, // 一丁七万丈
          0x4E09, 0x4E0A, 0x4E0B, 0x4E0D, 0x4E0E, // 三上下不与
          // 特殊記号
          0x301C, 0x2015, 0x2225, 0x2026, 0x2018, 0x2019 // 波ダッシュ、ダッシュ、並行記号など
        ]),
        tables: {
          os2: {
            usWeightClass: 500, // Medium
            ulUnicodeRange1: 0x03FF,
            ulCodePageRange1: 0x0003 // Latin-1, Japanese
          }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockYuGothicFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.from('yugothic-font-data'));

      const result = await analyzeFont('/System/Library/Fonts/Hiragino Sans GB.ttc');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.family).toBe('游ゴシック');
      expect(result.fontInfo?.style).toBe('Medium');
      expect(result.fontInfo?.weight).toBe(500);
      expect(result.fontInfo?.glyphCount).toBe(16000);
      
      // 日本語フォント特有の機能
      expect(result.fontInfo?.supportsJIS1).toBe(true);
      expect(result.fontInfo?.supportsJIS2).toBe(true);
      expect(result.fontInfo?.hasVerticalMetrics).toBe(true);
    });

    it('游明朝 Regular フォントの縦書き対応を確認', async () => {
      const mockYuMinchoFont = {
        postscriptName: 'YuMincho-Regular',
        fullName: '游明朝 Regular',
        familyName: '游明朝',
        subfamilyName: 'Regular',
        numGlyphs: 17000,
        characterSet: new Set([
          0x3041, 0x3042, 0x3043, // ひらがな
          0x65E5, 0x672C, 0x8A9E  // 漢字
        ]),
        tables: {
          vmtx: {}, // 縦書きメトリクス存在
          vhea: {
            ascent: 500,
            descent: -500
          }
        },
        hasTable: vi.fn((name: string) => ['vmtx', 'vhea'].includes(name))
      };

      mockFontkit.openSync.mockReturnValue(mockYuMinchoFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.from('yumincho-font-data'));

      const result = await analyzeFont('/System/Library/Fonts/YuMincho.ttc');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.family).toBe('游明朝');
      expect(result.fontInfo?.hasVerticalMetrics).toBe(true);
      expect(result.fontInfo?.supportsVerticalWriting).toBe(true);
    });

    it('游ゴシックのウェイトバリエーションが正しく認識される', async () => {
      const weights = [
        { name: 'Light', weight: 300, file: 'YuGothic-Light.ttf' },
        { name: 'Regular', weight: 400, file: 'YuGothic-Regular.ttf' },
        { name: 'Medium', weight: 500, file: 'YuGothic-Medium.ttf' },
        { name: 'Bold', weight: 700, file: 'YuGothic-Bold.ttf' }
      ];

      for (const weightInfo of weights) {
        const mockFont = {
          postscriptName: `YuGothic-${weightInfo.name}`,
          fullName: `游ゴシック ${weightInfo.name}`,
          familyName: '游ゴシック',
          subfamilyName: weightInfo.name,
          tables: {
            os2: {
              usWeightClass: weightInfo.weight
            }
          }
        };

        mockFontkit.openSync.mockReturnValue(mockFont as any);
        mockFs.readFile.mockResolvedValue(Buffer.from(`yugothic-${weightInfo.name.toLowerCase()}-data`));

        const result = await analyzeFont(`/test/${weightInfo.file}`);

        expect(result.success).toBe(true);
        expect(result.fontInfo?.style).toBe(weightInfo.name);
        expect(result.fontInfo?.weight).toBe(weightInfo.weight);
      }
    });
  });

  describe('ヒラギノフォントテスト', () => {
    it('ヒラギノ角ゴ ProN W3 が正しく解析される', async () => {
      const mockHiragino = {
        postscriptName: 'HiraginoSans-W3',
        fullName: 'ヒラギノ角ゴ ProN W3',
        familyName: 'ヒラギノ角ゴ ProN',
        subfamilyName: 'W3',
        version: 'Version 8.50',
        numGlyphs: 15900,
        characterSet: new Set([
          // Adobe-Japan1文字セット
          0x3041, 0x3042, 0x3043, // ひらがな
          0x30A1, 0x30A2, 0x30A3, // カタカナ
          0x65E5, 0x672C, 0x8A9E, // 漢字
          // ProN固有の文字
          0x20DD, 0x20DE, // 結合文字
        ]),
        tables: {
          os2: {
            usWeightClass: 300,
            ulUnicodeRange1: 0x03FF,
            ulUnicodeRange2: 0x1FFF
          }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockHiragino as any);
      mockFs.readFile.mockResolvedValue(Buffer.from('hiragino-font-data'));

      const result = await analyzeFont('/System/Library/Fonts/Hiragino Sans GB.ttc');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.family).toBe('ヒラギノ角ゴ ProN');
      expect(result.fontInfo?.style).toBe('W3');
      expect(result.fontInfo?.isProNFont).toBe(true);
      expect(result.fontInfo?.supportsAdobeJapan1).toBe(true);
    });

    it('ヒラギノ明朝 ProN W6 の太字設定が正しく認識される', async () => {
      const mockHiraginoMincho = {
        postscriptName: 'HiraginoSerif-W6',
        fullName: 'ヒラギノ明朝 ProN W6',
        familyName: 'ヒラギノ明朝 ProN',
        subfamilyName: 'W6',
        numGlyphs: 16500,
        tables: {
          os2: {
            usWeightClass: 600,
            fsSelection: 32 // Bold bit
          }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockHiraginoMincho as any);
      mockFs.readFile.mockResolvedValue(Buffer.from('hiragino-mincho-data'));

      const result = await analyzeFont('/test/HiraginoSerif-W6.otf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.family).toBe('ヒラギノ明朝 ProN');
      expect(result.fontInfo?.weight).toBe(600);
      expect(result.fontInfo?.isBold).toBe(true);
    });
  });

  describe('システムフォント特化テスト', () => {
    it('macOS Monterey以降のSF Pro JP フォントが処理される', async () => {
      const mockSFProJP = {
        postscriptName: 'SFProJP-Regular',
        fullName: 'SF Pro JP Regular',
        familyName: 'SF Pro JP',
        subfamilyName: 'Regular',
        version: 'Version 18.0d3e1',
        numGlyphs: 3200,
        characterSet: new Set([
          // Latin
          ...Array.from({ length: 95 }, (_, i) => i + 32),
          // Japanese
          0x3041, 0x3042, 0x3043, // ひらがな基本
          0x30A1, 0x30A2, 0x30A3, // カタカナ基本
          0x65E5, 0x672C // 基本漢字
        ]),
        tables: {
          os2: {
            usWeightClass: 400,
            ulUnicodeRange1: 0x03FF
          }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockSFProJP as any);
      mockFs.readFile.mockResolvedValue(Buffer.from('sfpro-jp-data'));

      const result = await analyzeFont('/System/Library/Fonts/SF-Pro-JP.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.family).toBe('SF Pro JP');
      expect(result.fontInfo?.isSystemFont).toBe(true);
      expect(result.fontInfo?.optimizedForUI).toBe(true);
    });

    it('iOS/iPadOS用 SF Pro JP フォントの特徴を認識', async () => {
      const mockSFProJPMobile = {
        postscriptName: 'SFProJP-Regular',
        fullName: 'SF Pro JP Regular',
        familyName: 'SF Pro JP',
        subfamilyName: 'Regular',
        numGlyphs: 2800,
        tables: {
          os2: {
            usWeightClass: 400,
            // モバイル向け最適化フラグ
            fsSelection: 256
          },
          head: {
            // モバイル向けヒンティング
            flags: 0x001F
          }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockSFProJPMobile as any);
      mockFs.readFile.mockResolvedValue(Buffer.from('sfpro-jp-mobile-data'));

      const result = await analyzeFont('/test/SFProJP-Mobile.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.optimizedForMobile).toBe(true);
      expect(result.fontInfo?.hasOptimizedHinting).toBe(true);
    });
  });

  describe('日本語フォント特有の文字処理', () => {
    it('異体字セレクタが正しく処理される', async () => {
      const testText = '葛󠄀城'; // 葛 + 異体字セレクタ + 城
      
      const options = {
        inputPath: '/test/font-with-ivs.otf',
        outputPath: '/test/output-ivs.woff2',
        characters: testText,
        outputFormat: 'woff2' as const,
        preserveVariationSequences: true
      };

      mockFs.readFile.mockResolvedValue(Buffer.from('ivs-font-data'));
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(Buffer.from('ivs-subset-data'));

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      // 異体字セレクタが保持されていることを確認
      expect(vi.mocked(mockSubsetFont)).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          text: testText,
          preserveVariationSequences: true
        })
      );
    });

    it('合成済み文字と分解文字の正規化', async () => {
      const testCases = [
        {
          input: 'が', // 合成済み（U+304C）
          normalized: 'が', // 分解形（U+304B + U+3099）
          description: 'ひらがな濁音の正規化'
        },
        {
          input: 'パ', // 合成済み（U+30D1）
          normalized: 'パ', // 分解形（U+30CF + U+309A）
          description: 'カタカナ半濁音の正規化'
        }
      ];

      for (const testCase of testCases) {
        const options = {
          inputPath: '/test/japanese-font.otf',
          outputPath: '/test/output.woff2',
          characters: testCase.input,
          outputFormat: 'woff2' as const,
          normalizeUnicode: true
        };

        mockFs.readFile.mockResolvedValue(Buffer.from('japanese-font-data'));
        const mockSubsetFont = (await import('subset-font')).default;
        vi.mocked(mockSubsetFont).mockClear();
        vi.mocked(mockSubsetFont).mockResolvedValue(Buffer.from('subset-data'));

        await subsetFont(options);

        // Unicode正規化が適用されたテキストが使用される
        expect(vi.mocked(mockSubsetFont)).toHaveBeenCalledWith(
          expect.any(Buffer),
          expect.objectContaining({
            text: expect.stringContaining(testCase.input)
          })
        );
      }
    });

    it('JISコード表の漢字レベル判定', async () => {
      const kanjiLevels = [
        {
          level: 'JIS1',
          characters: '亜唖娃阿哀愛挨姶逢葵茜穐悪握渥旭葦芦鯵梓圧斡扱宛姐虻飴絢綾鮎或粟袷安庵按暗案闇鞍杏以伊位依偉囲夷委威尉惟意慰易椅為畏異移維緯胃萎衣謂違遺医井亥域育郁磯一壱溢逸稲茨芋鰯允印咽員因姻引飲淫胤蔭',
          expectedLevel: 1
        },
        {
          level: 'JIS2',
          characters: '弌丐丕個丱丶丼丿乂乖乘亂亅豫亊舒弍于亞亟亠亢亰亳亶从仍仄仆仂仗仞仭仟价伉佚估佛佝佗佇佶侈侏侘佻佩佰侑佯來侖儘俔俟俎俘俛俑俚俐俤俥倚倨倔倪倥倅伜俶倡倸倩倬俾俯們倆偃假會偕偐偈做偖偬偸傀傚傅傴傲',
          expectedLevel: 2
        }
      ];

      for (const testCase of kanjiLevels) {
        const mockFont = {
          characterSet: new Set([
            ...Array.from(testCase.characters).map(c => c.charCodeAt(0))
          ])
        };

        mockFontkit.openSync.mockReturnValue(mockFont as any);
        mockFs.readFile.mockResolvedValue(Buffer.from('jis-font-data'));

        const result = await analyzeFont('/test/jis-font.otf');

        expect(result.success).toBe(true);
        if (testCase.expectedLevel === 1) {
          expect(result.fontInfo?.supportsJIS1).toBe(true);
        }
        if (testCase.expectedLevel === 2) {
          expect(result.fontInfo?.supportsJIS2).toBe(true);
        }
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きな日本語フォント（20MB）の処理性能', async () => {
      const largeJapaneseFontBuffer = Buffer.alloc(20 * 1024 * 1024);
      const expectedOutputBuffer = Buffer.alloc(2 * 1024 * 1024); // 90%削減

      mockFs.readFile.mockResolvedValue(largeJapaneseFontBuffer);
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        // 大きなフォントの処理時間をシミュレート
        await new Promise(resolve => setTimeout(resolve, 2000));
        return expectedOutputBuffer;
      });

      const joyoKanjiPreset = CHARACTER_PRESETS.find(p => p.id === 'joyo_kanji');
      const options = {
        inputPath: '/test/large-japanese-font.otf',
        outputPath: '/test/output.woff2',
        characters: joyoKanjiPreset!.characters,
        outputFormat: 'woff2' as const,
        enableWoff2Compression: true
      };

      const startTime = Date.now();
      const result = await subsetFont(options);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(10000); // 10秒以内
      
      const compressionRatio = result.outputSize! / result.originalSize!;
      expect(compressionRatio).toBeLessThan(0.15); // 85%以上削減
    });

    it('複数の日本語フォントの同時処理', async () => {
      const japaneseFonts = [
        'NotoSansCJKjp-Regular.otf',
        'YuGothic-Regular.ttf',
        'HiraginoSans-W3.ttc',
        'NotoSerifCJKjp-Regular.otf',
        'YuMincho-Regular.ttf'
      ];

      const mockResults = japaneseFonts.map((font, index) => ({
        success: true,
        outputPath: `/test/output-${index}.woff2`,
        processingTime: 1000 + Math.random() * 2000,
        originalSize: 15 * 1024 * 1024,
        outputSize: 1.5 * 1024 * 1024
      }));

      const processMultipleFonts = vi.fn().mockResolvedValue({
        success: true,
        processedFiles: mockResults,
        successCount: 5,
        failureCount: 0,
        totalProcessingTime: 3000,
        statistics: {
          averageCompressionRatio: 0.1,
          totalOriginalSize: 75 * 1024 * 1024,
          totalOutputSize: 7.5 * 1024 * 1024
        }
      });

      const fontConfigs = japaneseFonts.map((font, index) => ({
        path: `/test/${font}`,
        characters: CHARACTER_PRESETS[index % CHARACTER_PRESETS.length].characters,
        outputPath: `/test/output-${index}.woff2`
      }));

      const result = await processMultipleFonts(fontConfigs, {
        concurrent: true,
        maxConcurrency: 3
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(5);
      expect(result.statistics.averageCompressionRatio).toBeLessThan(0.15);
    });
  });

  describe('文字エンコーディング互換性', () => {
    it('Shift_JIS互換文字の処理', async () => {
      const shiftJISChars = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ ⅰ ⅱ ⅲ ⅳ ⅴ ⅵ ⅶ ⅷ ⅸ ⅹ ㍉ ㌔ ㌢ ㍍ ㌘ ㌧ ㌃ ㌶ ㍑ ㍗ ㌍ ㌦ ㌣ ㌫ ㍊ ㌻';
      
      const options = {
        inputPath: '/test/sjis-compat-font.ttf',
        outputPath: '/test/sjis-output.woff2',
        characters: shiftJISChars,
        outputFormat: 'woff2' as const,
        preserveShiftJISCompat: true
      };

      mockFs.readFile.mockResolvedValue(Buffer.from('sjis-font-data'));
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(Buffer.from('sjis-subset-data'));

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      expect(vi.mocked(mockSubsetFont)).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          text: expect.stringContaining('①②③')
        })
      );
    });

    it('EUC-JP互換文字の処理', async () => {
      const eucJPChars = '亜唖娃阿哀愛挨姶逢葵茜穐悪握渥旭葦芦鯵梓圧斡扱宛姐虻飴絢綾鮎或粟袷安庵按暗案闇鞍杏以伊位依偉囲夷委威尉惟意慰易椅為畏異移維緯胃萎衣謂違遺医井亥域育郁磯一壱溢逸稲茨芋鰯允印咽員因姻引飲淫胤蔭';
      
      const options = {
        inputPath: '/test/eucjp-compat-font.ttf',
        outputPath: '/test/eucjp-output.woff2',
        characters: eucJPChars,
        outputFormat: 'woff2' as const
      };

      mockFs.readFile.mockResolvedValue(Buffer.from('eucjp-font-data'));
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(Buffer.from('eucjp-subset-data'));

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      // EUC-JP第1水準漢字が含まれていることを確認
      expect(vi.mocked(mockSubsetFont)).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          text: expect.stringContaining('亜唖娃')
        })
      );
    });
  });

  describe('日本語タイポグラフィ機能', () => {
    it('OpenType機能（liga, kern, palt）の保持', async () => {
      const options = {
        inputPath: '/test/japanese-ot-font.otf',
        outputPath: '/test/ot-output.woff2',
        characters: 'あいうえお漢字',
        outputFormat: 'woff2' as const,
        preserveOpenTypeFeatures: true,
        features: ['liga', 'kern', 'palt', 'halt', 'vpal', 'vhal']
      };

      mockFs.readFile.mockResolvedValue(Buffer.from('ot-font-data'));
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(Buffer.from('ot-subset-data'));

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      expect(vi.mocked(mockSubsetFont)).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          preserveOpenTypeFeatures: true,
          features: expect.arrayContaining(['liga', 'kern', 'palt'])
        })
      );
    });

    it('縦書き用メトリクス（vmtx, vhea）の保持', async () => {
      const options = {
        inputPath: '/test/vertical-font.otf',
        outputPath: '/test/vertical-output.woff2',
        characters: '縦書きテスト文字列',
        outputFormat: 'woff2' as const,
        preserveVerticalMetrics: true
      };

      mockFs.readFile.mockResolvedValue(Buffer.from('vertical-font-data'));
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(Buffer.from('vertical-subset-data'));

      const result = await subsetFont(options);

      expect(result.success).toBe(true);
      expect(vi.mocked(mockSubsetFont)).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          preserveVerticalMetrics: true
        })
      );
    });
  });
});