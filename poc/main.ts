// harfbuzzjs を直接使用したサブセット化テスト
// 参考: harfbuzzjs/examples/hb-subset.example.node.js

// DOM要素
const dropZone = document.getElementById('dropZone') as HTMLDivElement
const fileInput = document.getElementById('fileInput') as HTMLInputElement
const statusEl = document.getElementById('status') as HTMLDivElement
const resultEl = document.getElementById('result') as HTMLDivElement
const logEl = document.getElementById('log') as HTMLPreElement
const testCharsEl = document.getElementById('testChars') as HTMLTextAreaElement
const originalSizeEl = document.getElementById('originalSize') as HTMLDivElement
const subsetSizeEl = document.getElementById('subsetSize') as HTMLDivElement
const reductionEl = document.getElementById('reduction') as HTMLDivElement
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement

// 状態
let subsetResult: Uint8Array | null = null
let currentFileName = ''
let wasmExports: any = null

// ログ出力
function log(message: string) {
  const timestamp = new Date().toLocaleTimeString()
  logEl.textContent += `\n[${timestamp}] ${message}`
  logEl.scrollTop = logEl.scrollHeight
  console.log(message)
}

// ステータス表示
function setStatus(message: string, type: 'processing' | 'success' | 'error') {
  statusEl.style.display = 'block'
  statusEl.textContent = message
  statusEl.className = `status ${type}`
}

// ファイルサイズフォーマット
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// WASM初期化
async function initWasm(): Promise<void> {
  if (wasmExports) return

  log('harfbuzzjs WASM を読み込み中...')

  // WASMファイルのパス（node_modulesから）
  const wasmUrl = new URL(
    '../node_modules/harfbuzzjs/hb-subset.wasm',
    import.meta.url
  ).href

  try {
    const response = await fetch(wasmUrl)
    if (!response.ok) {
      throw new Error(`WASM fetch failed: ${response.status}`)
    }

    const wasmBuffer = await response.arrayBuffer()
    const { instance } = await WebAssembly.instantiate(wasmBuffer)
    wasmExports = instance.exports

    log(`WASM読み込み完了 (${formatSize(wasmBuffer.byteLength)})`)
  } catch (error) {
    log(`WASM読み込みエラー: ${error}`)
    throw error
  }
}

// サブセット処理
function subsetFontWithHarfbuzz(
  fontData: Uint8Array,
  text: string
): Uint8Array {
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
  const unicodeSet = exports.hb_subset_input_unicode_set(input)

  // テキストの各文字のコードポイントを追加
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint !== undefined) {
      exports.hb_set_add(unicodeSet, codePoint)
    }
  }

  // サブセット実行
  const subset = exports.hb_subset_or_fail(face, input)
  exports.hb_subset_input_destroy(input)

  if (!subset) {
    exports.hb_face_destroy(face)
    exports.free(fontBuffer)
    throw new Error('サブセット化に失敗しました')
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
    throw new Error('サブセットフォントの生成に失敗しました')
  }

  // 結果をコピー（WASMメモリは上書きされる可能性があるため）
  const result = new Uint8Array(length)
  result.set(heapu8.subarray(offset, offset + length))

  // クリーンアップ
  exports.hb_blob_destroy(resultBlob)
  exports.hb_face_destroy(subset)
  exports.hb_face_destroy(face)
  exports.free(fontBuffer)

  return result
}

// フォント処理
async function processFont(file: File) {
  log(`ファイル選択: ${file.name} (${formatSize(file.size)})`)
  setStatus('処理中...', 'processing')
  resultEl.style.display = 'none'

  try {
    // WASM初期化
    await initWasm()

    // ファイル読み込み
    log('ファイルを読み込み中...')
    const arrayBuffer = await file.arrayBuffer()
    const fontData = new Uint8Array(arrayBuffer)
    log(`読み込み完了: ${fontData.length} bytes`)

    // テスト文字セット取得
    const testChars = testCharsEl.value
    log(`サブセット文字数: ${testChars.length}文字`)

    // サブセット実行
    log('harfbuzzjs でサブセット化中...')
    const startTime = performance.now()

    const result = subsetFontWithHarfbuzz(fontData, testChars)

    const endTime = performance.now()
    const processingTime = ((endTime - startTime) / 1000).toFixed(2)

    log(`処理完了! (${processingTime}秒)`)
    log(`出力サイズ: ${formatSize(result.length)}`)

    // 結果を保存
    subsetResult = result
    currentFileName = file.name.replace(/\.[^/.]+$/, '') + '-subset.ttf'

    // 結果表示
    const originalSize = file.size
    const outputSize = result.length
    const reduction = ((1 - outputSize / originalSize) * 100).toFixed(1)

    originalSizeEl.textContent = formatSize(originalSize)
    subsetSizeEl.textContent = formatSize(outputSize)
    reductionEl.textContent = `${reduction}%`

    resultEl.style.display = 'block'
    setStatus(`成功! harfbuzzjs (WASM) はブラウザで動作します`, 'success')

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log(`エラー: ${errorMessage}`)
    setStatus(`エラー: ${errorMessage}`, 'error')
    console.error(error)
  }
}

// ダウンロード
function downloadResult() {
  if (!subsetResult) return

  const blob = new Blob([subsetResult], { type: 'font/ttf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = currentFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  log(`ダウンロード: ${currentFileName}`)
}

// イベントリスナー
dropZone.addEventListener('click', () => fileInput.click())

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.classList.add('dragover')
})

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover')
})

dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('dragover')

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    processFont(files[0])
  }
})

fileInput.addEventListener('change', () => {
  const files = fileInput.files
  if (files && files.length > 0) {
    processFont(files[0])
  }
})

downloadBtn.addEventListener('click', downloadResult)

// 初期化
log('harfbuzzjs PoC 準備完了')
log('フォントファイルをドロップしてテストを開始してください')
