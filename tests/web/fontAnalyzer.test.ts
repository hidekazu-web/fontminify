import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeFont } from '../../src/lib/fontAnalyzer'

// fontkitをモック
vi.mock('fontkit', () => ({
  default: {
    create: vi.fn()
  }
}))

import fontkit from 'fontkit'
const mockFontkit = vi.mocked(fontkit)

describe('fontAnalyzer (Web版)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本的なフォント解析', () => {
    it('TTFフォントの基本情報を正しく解析する', async () => {
      const mockFont = {
        familyName: 'Noto Sans CJK JP',
        fullName: 'Noto Sans CJK JP Regular',
        subfamilyName: 'Regular',
        version: '2.004',
        numGlyphs: 17808,
        variationAxes: null
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array([0x00, 0x01, 0x00, 0x00])
      const result = await analyzeFont(data, 'NotoSansJP.ttf')

      expect(result.fileName).toBe('NotoSansJP.ttf')
      expect(result.format).toBe('ttf')
      expect(result.fontFamily).toBe('Noto Sans CJK JP')
      expect(result.fontSubfamily).toBe('Regular')
      expect(result.version).toBe('2.004')
      expect(result.glyphCount).toBe(17808)
      expect(result.isVariableFont).toBe(false)
    })

    it('OTFフォントの解析を正しく行う', async () => {
      const mockFont = {
        familyName: 'Source Han Sans',
        subfamilyName: 'Bold',
        version: '1.004',
        numGlyphs: 32768,
        variationAxes: null
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array([0x4F, 0x54, 0x54, 0x4F]) // OTTO magic
      const result = await analyzeFont(data, 'SourceHanSans.otf')

      expect(result.format).toBe('otf')
      expect(result.fontFamily).toBe('Source Han Sans')
      expect(result.fontSubfamily).toBe('Bold')
      expect(result.glyphCount).toBe(32768)
    })

    it('WOFFフォントの解析を正しく行う', async () => {
      const mockFont = {
        familyName: 'Test Font',
        subfamilyName: 'Regular',
        version: '1.0',
        numGlyphs: 500
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'test.woff')

      expect(result.format).toBe('woff')
    })

    it('WOFF2フォントの解析を正しく行う', async () => {
      const mockFont = {
        familyName: 'Test Font',
        subfamilyName: 'Regular',
        version: '1.0',
        numGlyphs: 500
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'test.woff2')

      expect(result.format).toBe('woff2')
    })
  })

  describe('バリアブルフォント検出', () => {
    it('配列形式のvariationAxesを正しく検出する', async () => {
      const mockVariableFont = {
        familyName: 'Variable Font',
        subfamilyName: 'Variable',
        version: '1.0',
        numGlyphs: 1000,
        variationAxes: [
          { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400 },
          { tag: 'wdth', name: 'Width', min: 75, max: 125, default: 100 }
        ]
      }

      mockFontkit.create.mockReturnValue(mockVariableFont as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'variable.ttf')

      expect(result.isVariableFont).toBe(true)
      expect(result.axes).toHaveLength(2)
      expect(result.axes![0]).toEqual({
        tag: 'wght',
        name: 'Weight',
        min: 100,
        max: 900,
        default: 400
      })
      expect(result.axes![1]).toEqual({
        tag: 'wdth',
        name: 'Width',
        min: 75,
        max: 125,
        default: 100
      })
    })

    it('オブジェクト形式のvariationAxesを正しく検出する', async () => {
      const mockVariableFont = {
        familyName: 'Variable Font',
        subfamilyName: 'Variable',
        version: '1.0',
        numGlyphs: 1000,
        variationAxes: {
          wght: { name: 'Weight', min: 100, max: 900, default: 400 },
          ital: { name: 'Italic', min: 0, max: 1, default: 0 }
        }
      }

      mockFontkit.create.mockReturnValue(mockVariableFont as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'variable.ttf')

      expect(result.isVariableFont).toBe(true)
      expect(result.axes).toHaveLength(2)
    })

    it('空のvariationAxesはバリアブルフォントとして検出しない', async () => {
      const mockFont = {
        familyName: 'Static Font',
        subfamilyName: 'Regular',
        version: '1.0',
        numGlyphs: 500,
        variationAxes: []
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'static.ttf')

      expect(result.isVariableFont).toBe(false)
      expect(result.axes).toBeUndefined()
    })

    it('nullのvariationAxesはバリアブルフォントとして検出しない', async () => {
      const mockFont = {
        familyName: 'Static Font',
        subfamilyName: 'Regular',
        version: '1.0',
        numGlyphs: 500,
        variationAxes: null
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'static.ttf')

      expect(result.isVariableFont).toBe(false)
    })
  })

  describe('TTCフォント（フォントコレクション）', () => {
    it('TTCフォントの最初のフォントを解析する', async () => {
      const mockFontCollection = {
        fonts: [
          {
            familyName: 'Font A',
            subfamilyName: 'Regular',
            version: '1.0',
            numGlyphs: 100
          },
          {
            familyName: 'Font B',
            subfamilyName: 'Bold',
            version: '1.0',
            numGlyphs: 100
          }
        ]
      }

      mockFontkit.create.mockReturnValue(mockFontCollection as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'collection.ttc')

      expect(result.format).toBe('ttc')
      expect(result.fontFamily).toBe('Font A')
    })
  })

  describe('エラーハンドリング', () => {
    it('空のデータでエラーを投げる', async () => {
      const emptyData = new Uint8Array(0)

      await expect(analyzeFont(emptyData, 'empty.ttf')).rejects.toThrow(
        'Empty font data provided'
      )
    })

    it('不正なフォント形式でエラーを投げる', async () => {
      const data = new Uint8Array([0x00, 0x01, 0x00, 0x00])

      await expect(analyzeFont(data, 'test.xyz')).rejects.toThrow(
        'Unsupported font format'
      )
    })

    it('fontkitエラー時はフォールバック値を使用する', async () => {
      mockFontkit.create.mockImplementation(() => {
        throw new Error('Invalid font data')
      })

      const data = new Uint8Array(10000)
      const result = await analyzeFont(data, 'corrupted.ttf')

      // フォールバック処理が動作
      expect(result.fileName).toBe('corrupted.ttf')
      expect(result.format).toBe('ttf')
      expect(result.fontFamily).toBe('corrupted') // ファイル名から
      expect(result.glyphCount).toBeGreaterThan(0) // 推定値
    })
  })

  describe('ファイルサイズ計算', () => {
    it('ファイルサイズを正しく取得する', async () => {
      const mockFont = {
        familyName: 'Test Font',
        subfamilyName: 'Regular',
        version: '1.0',
        numGlyphs: 500
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array(5000)
      const result = await analyzeFont(data, 'test.ttf')

      expect(result.fileSize).toBe(5000)
    })

    it('大きなフォントファイルサイズを正しく取得する', async () => {
      const mockFont = {
        familyName: 'Large Font',
        subfamilyName: 'Regular',
        version: '1.0',
        numGlyphs: 65535
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const largeData = new Uint8Array(10 * 1024 * 1024) // 10MB
      const result = await analyzeFont(largeData, 'large.ttf')

      expect(result.fileSize).toBe(10 * 1024 * 1024)
    })
  })

  describe('文字範囲情報', () => {
    it('デフォルトの文字範囲情報を含む', async () => {
      const mockFont = {
        familyName: 'Test Font',
        subfamilyName: 'Regular',
        version: '1.0',
        numGlyphs: 500
      }

      mockFontkit.create.mockReturnValue(mockFont as any)

      const data = new Uint8Array(100)
      const result = await analyzeFont(data, 'test.ttf')

      expect(result.characterRanges).toBeDefined()
      expect(result.characterRanges.length).toBeGreaterThan(0)

      // Basic Latinを含むか確認
      const basicLatin = result.characterRanges.find(
        r => r.name === 'Basic Latin'
      )
      expect(basicLatin).toBeDefined()
      expect(basicLatin!.start).toBe(0x0000)
      expect(basicLatin!.end).toBe(0x007f)

      // Hiraganaを含むか確認
      const hiragana = result.characterRanges.find(r => r.name === 'Hiragana')
      expect(hiragana).toBeDefined()
    })
  })
})
