import { OutputFormat } from '../shared/types'
import { encodeToWoff2 } from './woff2Encoder'

/**
 * プログレスコールバックの型
 */
export interface ProgressPayload {
  stage: string
  progress: number
  message: string
}

export type ProgressCallback = (progress: ProgressPayload) => void

/**
 * サブセット処理オプション
 */
export interface WebSubsetOptions {
  text: string
  outputFormat: OutputFormat
  fileName: string
  variationAxes?: Record<string, number>
  pinVariationAxes?: boolean
}

/**
 * サブセット処理結果
 */
export interface SubsetResult {
  data: Uint8Array
  originalSize: number
  outputSize: number
  fileName: string
}

// harfbuzzjs WASMエクスポート
interface HarfbuzzExports {
  memory: WebAssembly.Memory
  malloc: (size: number) => number
  free: (ptr: number) => void
  hb_blob_create: (data: number, length: number, mode: number, userData: number, destroy: number) => number
  hb_blob_destroy: (blob: number) => void
  hb_blob_get_data: (blob: number, length: number) => number
  hb_blob_get_length: (blob: number) => number
  hb_face_create: (blob: number, index: number) => number
  hb_face_destroy: (face: number) => void
  hb_face_reference_blob: (face: number) => number
  hb_subset_input_create_or_fail: () => number
  hb_subset_input_destroy: (input: number) => void
  hb_subset_input_unicode_set: (input: number) => number
  hb_set_add: (set: number, codepoint: number) => void
  hb_subset_or_fail: (face: number, input: number) => number
  // 軸固定用関数
  hb_subset_input_pin_axis_location: (input: number, face: number, axisTag: number, axisValue: number) => number
}

let wasmExports: HarfbuzzExports | null = null
let wasmLoading: Promise<void> | null = null

/**
 * 軸タグ文字列を数値に変換（HarfBuzz形式）
 */
function HB_TAG(str: string): number {
  return str.split('').reduce((a, ch) => (a << 8) + ch.charCodeAt(0), 0)
}

/**
 * harfbuzzjs WASMを初期化
 */
async function initWasm(): Promise<void> {
  if (wasmExports) return
  if (wasmLoading) return wasmLoading

  wasmLoading = (async () => {
    console.log('Loading harfbuzzjs WASM...')

    // WASMファイルのパス（Viteがnode_modulesからコピー）
    const wasmUrl = new URL(
      '../../node_modules/harfbuzzjs/hb-subset.wasm',
      import.meta.url
    ).href

    try {
      const response = await fetch(wasmUrl)
      if (!response.ok) {
        throw new Error(`WASM fetch failed: ${response.status}`)
      }

      const wasmBuffer = await response.arrayBuffer()
      const { instance } = await WebAssembly.instantiate(wasmBuffer)
      wasmExports = instance.exports as unknown as HarfbuzzExports

      console.log('WASM loaded successfully')
    } catch (error) {
      console.error('WASM loading error:', error)
      throw error
    }
  })()

  await wasmLoading
}

/**
 * harfbuzzjs WASMを使用してフォントをサブセット化（TTF出力）
 */
function subsetWithHarfbuzz(
  fontData: Uint8Array,
  text: string,
  variationAxes?: Record<string, number>,
  pinVariationAxes?: boolean
): Uint8Array {
  if (!wasmExports) {
    throw new Error('WASM not initialized')
  }

  const exports = wasmExports
  const heapu8 = new Uint8Array(exports.memory.buffer)

  // フォントデータをWASMメモリにコピー
  const fontBuffer = exports.malloc(fontData.byteLength)
  heapu8.set(fontData, fontBuffer)

  // フェイス作成
  const blob = exports.hb_blob_create(
    fontBuffer,
    fontData.byteLength,
    2, // HB_MEMORY_MODE_WRITABLE
    0,
    0
  )
  const face = exports.hb_face_create(blob, 0)
  exports.hb_blob_destroy(blob)

  // サブセット入力設定
  const input = exports.hb_subset_input_create_or_fail()
  if (!input) {
    exports.hb_face_destroy(face)
    exports.free(fontBuffer)
    throw new Error('Failed to create subset input')
  }

  const unicodeSet = exports.hb_subset_input_unicode_set(input)

  // テキストの各文字のコードポイントを追加
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint !== undefined) {
      exports.hb_set_add(unicodeSet, codePoint)
    }
  }

  // 軸固定オプションの処理
  if (pinVariationAxes && variationAxes && Object.keys(variationAxes).length > 0) {
    console.log('Pinning variation axes:', variationAxes)
    for (const [axisTag, axisValue] of Object.entries(variationAxes)) {
      const tag = HB_TAG(axisTag)
      const result = exports.hb_subset_input_pin_axis_location(input, face, tag, axisValue)
      if (!result) {
        console.warn(`Failed to pin axis ${axisTag} to ${axisValue}`)
      } else {
        console.log(`Pinned axis ${axisTag} to ${axisValue}`)
      }
    }
  }

  // サブセット実行
  const subset = exports.hb_subset_or_fail(face, input)
  exports.hb_subset_input_destroy(input)

  if (!subset) {
    exports.hb_face_destroy(face)
    exports.free(fontBuffer)
    throw new Error('Subset operation failed')
  }

  // 結果取得
  const resultBlob = exports.hb_face_reference_blob(subset)
  const offset = exports.hb_blob_get_data(resultBlob, 0)
  const length = exports.hb_blob_get_length(resultBlob)

  if (length === 0) {
    exports.hb_blob_destroy(resultBlob)
    exports.hb_face_destroy(subset)
    exports.hb_face_destroy(face)
    exports.free(fontBuffer)
    throw new Error('Empty subset result')
  }

  // 結果をコピー（WASMメモリは上書きされる可能性があるため）
  // メモリが再配置された可能性があるので再取得
  const currentHeap = new Uint8Array(exports.memory.buffer)
  const result = new Uint8Array(length)
  result.set(currentHeap.subarray(offset, offset + length))

  // クリーンアップ
  exports.hb_blob_destroy(resultBlob)
  exports.hb_face_destroy(subset)
  exports.hb_face_destroy(face)
  exports.free(fontBuffer)

  return result
}

/**
 * 出力ファイル名を生成
 */
function generateOutputFileName(originalName: string, format: OutputFormat): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  return `${baseName}-subset.${format}`
}

/**
 * フォントをサブセット化するメイン関数
 */
export async function subsetFont(
  data: Uint8Array,
  options: WebSubsetOptions,
  progressCallback?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<SubsetResult> {
  const startTime = performance.now()

  // キャンセルチェック
  if (abortSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  try {
    // フェーズ1: WASM初期化
    progressCallback?.({
      stage: 'initializing',
      progress: 10,
      message: 'サブセットエンジンを初期化中...'
    })

    await initWasm()

    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    // フェーズ2: サブセット化
    progressCallback?.({
      stage: 'subsetting',
      progress: 30,
      message: `${options.text.length}文字をサブセット化中...`
    })

    console.log('Starting subset with', options.text.length, 'characters')
    console.log('Variation axes options:', {
      pinVariationAxes: options.pinVariationAxes,
      variationAxes: options.variationAxes
    })
    const ttfData = subsetWithHarfbuzz(
      data,
      options.text,
      options.variationAxes,
      options.pinVariationAxes
    )
    console.log('Subset completed:', ttfData.length, 'bytes')

    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    // フェーズ3: フォーマット変換（必要な場合）
    let outputData: Uint8Array

    if (options.outputFormat === 'woff2') {
      progressCallback?.({
        stage: 'compressing',
        progress: 70,
        message: 'WOFF2に圧縮中...'
      })

      outputData = await encodeToWoff2(ttfData)
      console.log('WOFF2 compression completed:', outputData.length, 'bytes')
    } else {
      outputData = ttfData
    }

    // フェーズ4: 完了
    const endTime = performance.now()
    const processingTime = ((endTime - startTime) / 1000).toFixed(2)

    progressCallback?.({
      stage: 'complete',
      progress: 100,
      message: `完了 (${processingTime}秒)`
    })

    const fileName = generateOutputFileName(options.fileName, options.outputFormat)

    return {
      data: outputData,
      originalSize: data.length,
      outputSize: outputData.length,
      fileName
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    console.error('Subset error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`サブセット化に失敗しました: ${errorMessage}`)
  }
}
