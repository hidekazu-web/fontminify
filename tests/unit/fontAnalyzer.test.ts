import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeFont } from '../../src/main/services/fontAnalyzer';
import * as fs from 'fs/promises';
import * as fontkit from 'fontkit';

// Mock fontkit
vi.mock('fontkit');
const mockFontkit = vi.mocked(fontkit);

// Mock fs/promises
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

describe('フォント解析テスト（メタデータ抽出精度）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的なフォント解析', () => {
    it('TTFフォントの基本情報を正しく抽出する', async () => {
      // モックフォントオブジェクトを作成
      const mockFont = {
        postscriptName: 'NotoSansCJK-Regular',
        fullName: 'Noto Sans CJK JP Regular',
        familyName: 'Noto Sans CJK JP',
        subfamilyName: 'Regular',
        copyright: '© 2014 Google Inc.',
        version: '2.004',
        unitsPerEm: 1000,
        ascent: 1160,
        descent: -288,
        lineGap: 0,
        underlinePosition: -100,
        underlineThickness: 50,
        italicAngle: 0,
        capHeight: 733,
        xHeight: 543,
        bbox: { minX: -1000, minY: -288, maxX: 2000, maxY: 1160 },
        numGlyphs: 65535,
        characterSet: new Set(['a', 'b', 'c', 'あ', 'い', 'う', '漢', '字']),
        availableFeatures: ['kern', 'liga', 'calt'],
        variationAxes: {},
        _src: { buffer: Buffer.alloc(1024) },
        tables: {
          head: { created: new Date('2014-01-01'), modified: new Date('2020-01-01') },
          hhea: { ascent: 1160, descent: -288, lineGap: 0 },
          OS2: { 
            xAvgCharWidth: 500,
            usWeightClass: 400,
            usWidthClass: 5,
            fsSelection: 0,
            version: 4
          },
          post: { version: 2.0, italicAngle: 0, underlinePosition: -100 },
          name: {
            records: {
              '1': 'Noto Sans CJK JP',
              '2': 'Regular',
              '4': 'Noto Sans CJK JP Regular',
              '6': 'NotoSansCJK-Regular'
            }
          }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(1024));

      const result = await analyzeFont('/path/to/font.ttf');

      expect(result).toEqual({
        success: true,
        fontInfo: {
          postscriptName: 'NotoSansCJK-Regular',
          fullName: 'Noto Sans CJK JP Regular',
          familyName: 'Noto Sans CJK JP',
          subfamilyName: 'Regular',
          copyright: '© 2014 Google Inc.',
          version: '2.004',
          format: 'ttf',
          fileSize: 1024,
          
          // メトリクス情報
          unitsPerEm: 1000,
          ascent: 1160,
          descent: -288,
          lineGap: 0,
          xHeight: 543,
          capHeight: 733,
          
          // グリフ情報
          numGlyphs: 65535,
          characterCount: 8,
          supportedScripts: ['Latin', 'Hiragana', 'Katakana', 'CJK'],
          
          // OpenType機能
          availableFeatures: ['kern', 'liga', 'calt'],
          isVariableFont: false,
          
          // ファイル情報
          created: mockFont.tables.head.created,
          modified: mockFont.tables.head.modified,
          
          // 推定サイズ情報
          estimatedSubsetSizes: expect.objectContaining({
            hiragana: expect.any(Number),
            katakana: expect.any(Number),
            kanjiN5: expect.any(Number),
            ascii: expect.any(Number)
          })
        }
      });

      expect(mockFontkit.openSync).toHaveBeenCalledWith('/path/to/font.ttf');
    });

    it('OTFフォントの解析を正しく行う', async () => {
      const mockFont = {
        postscriptName: 'SourceHanSans-Regular',
        fullName: 'Source Han Sans Regular',
        familyName: 'Source Han Sans',
        subfamilyName: 'Regular',
        copyright: '© 2014 Adobe Systems Incorporated',
        version: '1.004',
        unitsPerEm: 1000,
        ascent: 1160,
        descent: -288,
        lineGap: 0,
        numGlyphs: 32768,
        characterSet: new Set(['a', 'b', 'c', 'あ', 'い', 'う']),
        availableFeatures: ['kern', 'liga'],
        variationAxes: {},
        _src: { buffer: Buffer.alloc(2048) },
        tables: {
          head: { created: new Date('2014-01-01'), modified: new Date('2020-01-01') },
          CFF: { version: 1.0 }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(2048));

      const result = await analyzeFont('/path/to/font.otf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.format).toBe('otf');
      expect(result.fontInfo?.fileSize).toBe(2048);
      expect(result.fontInfo?.numGlyphs).toBe(32768);
    });

    it('可変フォントを正しく識別する', async () => {
      const mockVariableFont = {
        postscriptName: 'NotoSans-Variable',
        fullName: 'Noto Sans Variable',
        familyName: 'Noto Sans',
        subfamilyName: 'Variable',
        unitsPerEm: 1000,
        numGlyphs: 1000,
        characterSet: new Set(['a', 'b', 'c']),
        availableFeatures: ['kern'],
        variationAxes: {
          wght: { min: 100, default: 400, max: 900 },
          wdth: { min: 75, default: 100, max: 125 }
        },
        _src: { buffer: Buffer.alloc(1024) },
        tables: {
          head: { created: new Date(), modified: new Date() },
          fvar: { axes: 2 }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockVariableFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(1024));

      const result = await analyzeFont('/path/to/variable.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.isVariableFont).toBe(true);
      expect(result.fontInfo?.variationAxes).toEqual({
        wght: { min: 100, default: 400, max: 900 },
        wdth: { min: 75, default: 100, max: 125 }
      });
    });
  });

  describe('文字セット解析', () => {
    it('対応スクリプトを正しく判定する', async () => {
      const mockFont = {
        postscriptName: 'TestFont',
        fullName: 'Test Font',
        familyName: 'Test',
        unitsPerEm: 1000,
        numGlyphs: 1000,
        characterSet: new Set([
          // Latin
          'a', 'b', 'c', 'A', 'B', 'C', '1', '2', '3',
          // Hiragana
          'あ', 'い', 'う', 'え', 'お',
          // Katakana
          'ア', 'イ', 'ウ', 'エ', 'オ',
          // CJK Ideographs
          '漢', '字', '日', '本', '語',
          // Cyrillic
          'а', 'б', 'в', 'А', 'Б', 'В',
          // Arabic
          'ا', 'ب', 'ت'
        ]),
        availableFeatures: [],
        variationAxes: {},
        _src: { buffer: Buffer.alloc(1024) },
        tables: { head: { created: new Date(), modified: new Date() } }
      };

      mockFontkit.openSync.mockReturnValue(mockFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(1024));

      const result = await analyzeFont('/path/to/multilingual.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.supportedScripts).toContain('Latin');
      expect(result.fontInfo?.supportedScripts).toContain('Hiragana');
      expect(result.fontInfo?.supportedScripts).toContain('Katakana');
      expect(result.fontInfo?.supportedScripts).toContain('CJK');
      expect(result.fontInfo?.supportedScripts).toContain('Cyrillic');
      expect(result.fontInfo?.supportedScripts).toContain('Arabic');
    });

    it('文字セットサイズを正確にカウントする', async () => {
      const characters = new Set();
      // 1000文字のダミー文字セットを作成
      for (let i = 0; i < 1000; i++) {
        characters.add(String.fromCharCode(65 + (i % 26))); // A-Z cycling
      }

      const mockFont = {
        postscriptName: 'TestFont',
        fullName: 'Test Font',
        familyName: 'Test',
        unitsPerEm: 1000,
        numGlyphs: 2000,
        characterSet: characters,
        availableFeatures: [],
        variationAxes: {},
        _src: { buffer: Buffer.alloc(1024) },
        tables: { head: { created: new Date(), modified: new Date() } }
      };

      mockFontkit.openSync.mockReturnValue(mockFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(1024));

      const result = await analyzeFont('/path/to/font.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.characterCount).toBe(26); // 重複文字は除外される
      expect(result.fontInfo?.numGlyphs).toBe(2000);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないファイルでエラーを返す', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await analyzeFont('/path/to/nonexistent.ttf');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイルが見つかりません');
    });

    it('破損したフォントファイルでエラーを返す', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.alloc(1024));
      mockFontkit.openSync.mockImplementation(() => {
        throw new Error('Invalid font data');
      });

      const result = await analyzeFont('/path/to/corrupted.ttf');

      expect(result.success).toBe(false);
      expect(result.error).toContain('フォントファイルの解析に失敗しました');
    });

    it('不正なファイル形式でエラーを返す', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('This is not a font file'));
      mockFontkit.openSync.mockImplementation(() => {
        throw new Error('Not a font file');
      });

      const result = await analyzeFont('/path/to/invalid.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('フォントファイルの解析に失敗しました');
    });
  });

  describe('メタデータ精度テスト', () => {
    it('日本語フォント固有の情報を正しく抽出する', async () => {
      const mockJapaneseFont = {
        postscriptName: 'NotoSansCJKjp-Regular',
        fullName: 'Noto Sans CJK JP Regular',
        familyName: 'Noto Sans CJK JP',
        subfamilyName: 'Regular',
        copyright: '© 2014 Google Inc.',
        version: '2.004',
        unitsPerEm: 1000,
        ascent: 1160,
        descent: -288,
        numGlyphs: 65535,
        characterSet: new Set([
          // ひらがな (84文字サンプル)
          'あ', 'い', 'う', 'え', 'お', 'か', 'が', 'き', 'ぎ', 'く',
          // カタカナ (84文字サンプル)  
          'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'ガ', 'キ', 'ギ', 'ク',
          // 漢字 (JIS第1水準サンプル)
          '亜', '唖', '娃', '阿', '哀', '愛', '挨', '姶', '逢', '葵',
          // ASCII
          'a', 'b', 'c', 'A', 'B', 'C', '1', '2', '3', '!', '@'
        ]),
        availableFeatures: ['kern', 'liga', 'calt', 'halt', 'vhal'],
        variationAxes: {},
        _src: { buffer: Buffer.alloc(10 * 1024 * 1024) }, // 10MB
        tables: {
          head: { created: new Date('2014-01-01'), modified: new Date('2020-01-01') },
          OS2: { usWeightClass: 400, usWidthClass: 5, fsSelection: 0 }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockJapaneseFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(10 * 1024 * 1024));

      const result = await analyzeFont('/path/to/japanese.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.supportedScripts).toContain('Hiragana');
      expect(result.fontInfo?.supportedScripts).toContain('Katakana');
      expect(result.fontInfo?.supportedScripts).toContain('CJK');
      expect(result.fontInfo?.availableFeatures).toContain('halt');
      expect(result.fontInfo?.availableFeatures).toContain('vhal');
      expect(result.fontInfo?.fileSize).toBe(10 * 1024 * 1024);
    });

    it('フォントメトリクスの精度を検証する', async () => {
      const mockFont = {
        postscriptName: 'TestFont-Regular',
        fullName: 'Test Font Regular',
        familyName: 'Test Font',
        unitsPerEm: 2048, // 高精度
        ascent: 1638,
        descent: -410,
        lineGap: 0,
        xHeight: 1024,
        capHeight: 1434,
        bbox: { minX: -500, minY: -410, maxX: 2000, maxY: 1638 },
        underlinePosition: -150,
        underlineThickness: 100,
        italicAngle: -12.5,
        numGlyphs: 500,
        characterSet: new Set(['a', 'b', 'c']),
        availableFeatures: [],
        variationAxes: {},
        _src: { buffer: Buffer.alloc(1024) },
        tables: {
          head: { created: new Date('2020-01-01'), modified: new Date('2021-06-15') },
          hhea: { ascent: 1638, descent: -410, lineGap: 0 },
          OS2: { xHeight: 1024, capHeight: 1434 }
        }
      };

      mockFontkit.openSync.mockReturnValue(mockFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(1024));

      const result = await analyzeFont('/path/to/precise.ttf');

      expect(result.success).toBe(true);
      expect(result.fontInfo?.unitsPerEm).toBe(2048);
      expect(result.fontInfo?.ascent).toBe(1638);
      expect(result.fontInfo?.descent).toBe(-410);
      expect(result.fontInfo?.xHeight).toBe(1024);
      expect(result.fontInfo?.capHeight).toBe(1434);
      expect(result.fontInfo?.bbox).toEqual({
        minX: -500, minY: -410, maxX: 2000, maxY: 1638
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きなフォントファイルを効率的に処理する', async () => {
      // 大きなフォントファイルをシミュレート
      const largeCharacterSet = new Set();
      for (let i = 0; i < 65535; i++) {
        largeCharacterSet.add(String.fromCharCode(i % 65536));
      }

      const mockLargeFont = {
        postscriptName: 'LargeFont-Regular',
        fullName: 'Large Font Regular',
        familyName: 'Large Font',
        unitsPerEm: 1000,
        numGlyphs: 65535,
        characterSet: largeCharacterSet,
        availableFeatures: Array.from({ length: 50 }, (_, i) => `feat${i}`),
        variationAxes: {},
        _src: { buffer: Buffer.alloc(20 * 1024 * 1024) }, // 20MB
        tables: { head: { created: new Date(), modified: new Date() } }
      };

      mockFontkit.openSync.mockReturnValue(mockLargeFont as any);
      mockFs.readFile.mockResolvedValue(Buffer.alloc(20 * 1024 * 1024));

      const startTime = Date.now();
      const result = await analyzeFont('/path/to/large.ttf');
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(5000); // 5秒以内
      expect(result.fontInfo?.numGlyphs).toBe(65535);
      expect(result.fontInfo?.fileSize).toBe(20 * 1024 * 1024);
    }, 10000);
  });
});