import { compress } from 'woff2-encoder'

/**
 * TTFデータをWOFF2形式にエンコード
 */
export async function encodeToWoff2(ttfData: Uint8Array): Promise<Uint8Array> {
  try {
    console.log('Starting WOFF2 encoding, input size:', ttfData.length)

    // woff2-encoderのcompress関数を使用
    const woff2Data = await compress(ttfData)

    console.log('WOFF2 encoding complete, output size:', woff2Data.length)
    console.log('Compression ratio:', ((1 - woff2Data.length / ttfData.length) * 100).toFixed(1) + '%')

    return new Uint8Array(woff2Data)
  } catch (error) {
    console.error('WOFF2 encoding error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`WOFF2エンコードに失敗しました: ${errorMessage}`)
  }
}
