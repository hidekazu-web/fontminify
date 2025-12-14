import { FontAnalysis, VariableAxis } from '../shared/types'

// fontkitを動的インポートするためのヘルパー
async function loadFontkit() {
  const fontkit = await import('fontkit')
  return fontkit.default || fontkit
}

/**
 * フォントを解析（Web版 - Uint8Array入力）
 */
export async function analyzeFont(
  data: Uint8Array,
  fileName: string
): Promise<FontAnalysis> {
  try {
    console.log('Starting font analysis for:', fileName)

    if (!data || data.length === 0) {
      throw new Error('Empty font data provided')
    }

    const fileSize = data.length
    const ext = '.' + fileName.split('.').pop()?.toLowerCase()

    let format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'ttc'
    switch (ext) {
      case '.ttf':
        format = 'ttf'
        break
      case '.otf':
        format = 'otf'
        break
      case '.woff':
        format = 'woff'
        break
      case '.woff2':
        format = 'woff2'
        break
      case '.ttc':
        format = 'ttc'
        break
      default:
        throw new Error(`Unsupported font format: ${ext}`)
    }

    // fontkitを使用してフォント情報を解析
    let fontFamily = fileName.replace(ext, '') || 'Unknown Font'
    let fontSubfamily = 'Regular'
    let version = '1.0'
    let glyphCount = 0
    let isVariableFont = false
    let variableAxes: VariableAxis[] | undefined

    try {
      const fontkit = await loadFontkit()
      // fontkitはUint8Arrayを直接受け入れる（Bufferはブラウザで利用不可）
      const fontOrCollection = fontkit.create(data)
      const font = 'fonts' in fontOrCollection ? fontOrCollection.fonts[0] : fontOrCollection

      fontFamily = font.familyName || font.fullName || fontFamily
      fontSubfamily = font.subfamilyName || 'Regular'
      version = font.version || '1.0'
      glyphCount = font.numGlyphs || estimateGlyphCount(data.length)

      // バリアブルフォントの検出
      if (font.variationAxes) {
        const axes = font.variationAxes
        if (Array.isArray(axes) && axes.length > 0) {
          isVariableFont = true
          variableAxes = axes.map((axis: any) => ({
            tag: axis.tag,
            name: axis.name,
            min: axis.min,
            max: axis.max,
            default: axis.default,
          }))
        } else if (typeof axes === 'object' && Object.keys(axes).length > 0) {
          // Record形式の場合
          isVariableFont = true
          variableAxes = Object.entries(axes).map(([tag, info]: [string, any]) => ({
            tag,
            name: info.name,
            min: info.min,
            max: info.max,
            default: info.default,
          }))
        }
      }

      console.log('Fontkit analysis:', {
        fontFamily,
        fontSubfamily,
        glyphCount,
        isVariableFont,
        axesCount: variableAxes?.length || 0
      })
    } catch (fontkitError) {
      console.warn('Fontkit analysis failed, using fallback:', fontkitError)
      glyphCount = estimateGlyphCount(data.length)
    }

    const characterRanges = getDefaultCharacterRanges()

    const analysis: FontAnalysis = {
      fileName,
      fileSize,
      format,
      fontFamily,
      fontSubfamily,
      version,
      glyphCount,
      characterRanges,
      features: [],
      languages: ['ja', 'en'],
      hasColorEmoji: false,
      isVariableFont,
      axes: variableAxes,
    }

    console.log('Analysis completed successfully:', analysis)
    return analysis
  } catch (error) {
    console.error('Font analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to analyze font: ${errorMessage}`)
  }
}

function estimateGlyphCount(byteLength: number): number {
  // ファイルサイズから概算（簡易版）
  const estimate = Math.floor(byteLength / 100)
  return Math.max(estimate, 100)
}

function getDefaultCharacterRanges() {
  return [
    { start: 0x0000, end: 0x007F, name: 'Basic Latin' },
    { start: 0x3040, end: 0x309F, name: 'Hiragana' },
    { start: 0x30A0, end: 0x30FF, name: 'Katakana' },
    { start: 0x4E00, end: 0x9FFF, name: 'CJK Unified Ideographs' },
  ]
}
