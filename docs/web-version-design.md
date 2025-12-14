# FontMinify Web版 設計書

作成日: 2024-12-14

## 1. アーキテクチャ概要

### 1.1 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                        ブラウザ                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  メインスレッド                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   React UI  │  │   Zustand   │  │  Worker API │  │   │
│  │  │  Components │◄─┤    Store    │◄─┤   Bridge    │  │   │
│  │  └─────────────┘  └─────────────┘  └──────┬──────┘  │   │
│  └───────────────────────────────────────────┼─────────┘   │
│                                              │              │
│                                     postMessage            │
│                                              │              │
│  ┌───────────────────────────────────────────▼─────────┐   │
│  │                   Web Worker                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   fontkit   │  │ harfbuzzjs  │  │   woff2     │  │   │
│  │  │  (解析)     │  │(WASM直接)   │  │  (圧縮)     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 ディレクトリ構成（変更後）

```
src/
├── web/                        # Web版専用コード
│   ├── main.tsx               # エントリポイント
│   ├── App.tsx                # ルートコンポーネント
│   ├── workers/               # Web Worker
│   │   ├── font.worker.ts     # フォント処理Worker
│   │   └── types.ts           # Worker通信型定義
│   ├── services/              # Web版サービス層
│   │   ├── fontProcessor.ts   # Worker API ブリッジ
│   │   ├── fileHandler.ts     # File API ラッパー
│   │   └── downloadManager.ts # ダウンロード処理
│   ├── hooks/                 # Web版専用フック
│   │   └── useFontProcessing.ts
│   └── vite.config.ts         # Web版ビルド設定
│
├── renderer/                   # 共通UIコンポーネント（流用）
│   ├── components/            # 95%流用可能
│   ├── stores/                # 修正して流用
│   └── styles/                # 100%流用
│
├── shared/                     # 共有コード（100%流用）
│   ├── types.ts
│   ├── constants.ts
│   ├── presets.ts
│   ├── charsets/
│   └── validation.ts
│
└── lib/                        # フォント処理ロジック（移植）
    ├── fontAnalyzer.ts        # Buffer→Uint8Array変換
    └── fontSubsetter.ts       # Buffer→Uint8Array変換
```

---

## 2. Web Worker設計

### 2.1 Worker通信プロトコル

```typescript
// src/web/workers/types.ts

// リクエストの種類
type WorkerRequestType = 'analyze' | 'subset' | 'cancel'

// メインスレッド → Worker
interface WorkerRequest<T = unknown> {
  type: WorkerRequestType
  id: string           // リクエスト識別子（UUID）
  payload: T
}

interface AnalyzePayload {
  fileData: Uint8Array
  fileName: string
}

interface SubsetPayload {
  fileData: Uint8Array
  fileName: string
  options: SubsetOptions
}

// Worker → メインスレッド
type WorkerResponseType = 'result' | 'progress' | 'error' | 'cancelled'

interface WorkerResponse<T = unknown> {
  type: WorkerResponseType
  id: string
  payload: T
}

interface AnalyzeResult {
  analysis: FontAnalysis
}

interface SubsetResult {
  data: Uint8Array
  originalSize: number
  outputSize: number
  fileName: string
}

interface ProgressPayload {
  stage: string
  progress: number      // 0-100
  message: string
}

interface ErrorPayload {
  code: string
  message: string
  details?: string
}
```

### 2.2 Worker実装

```typescript
// src/web/workers/font.worker.ts

import { analyzeFont } from '@lib/fontAnalyzer'
import { subsetFont } from '@lib/fontSubsetter'

// 処理中のリクエストを管理
const activeRequests = new Map<string, AbortController>()

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, id, payload } = event.data

  switch (type) {
    case 'analyze':
      await handleAnalyze(id, payload as AnalyzePayload)
      break
    case 'subset':
      await handleSubset(id, payload as SubsetPayload)
      break
    case 'cancel':
      handleCancel(id)
      break
  }
}

async function handleAnalyze(id: string, payload: AnalyzePayload) {
  try {
    const controller = new AbortController()
    activeRequests.set(id, controller)

    const analysis = await analyzeFont(payload.fileData, payload.fileName)

    self.postMessage({
      type: 'result',
      id,
      payload: { analysis }
    })
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      payload: { code: 'ANALYZE_ERROR', message: error.message }
    })
  } finally {
    activeRequests.delete(id)
  }
}

async function handleSubset(id: string, payload: SubsetPayload) {
  try {
    const controller = new AbortController()
    activeRequests.set(id, controller)

    const result = await subsetFont(
      payload.fileData,
      payload.options,
      // プログレスコールバック
      (progress) => {
        self.postMessage({
          type: 'progress',
          id,
          payload: progress
        })
      },
      controller.signal
    )

    self.postMessage({
      type: 'result',
      id,
      payload: result
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      self.postMessage({ type: 'cancelled', id, payload: {} })
    } else {
      self.postMessage({
        type: 'error',
        id,
        payload: { code: 'SUBSET_ERROR', message: error.message }
      })
    }
  } finally {
    activeRequests.delete(id)
  }
}

function handleCancel(id: string) {
  const controller = activeRequests.get(id)
  if (controller) {
    controller.abort()
  }
}
```

### 2.3 Worker APIブリッジ

```typescript
// src/web/services/fontProcessor.ts

class FontProcessor {
  private worker: Worker
  private pendingRequests: Map<string, {
    resolve: (value: any) => void
    reject: (error: any) => void
    onProgress?: (progress: ProgressPayload) => void
  }>

  constructor() {
    this.worker = new Worker(
      new URL('../workers/font.worker.ts', import.meta.url),
      { type: 'module' }
    )
    this.pendingRequests = new Map()
    this.worker.onmessage = this.handleMessage.bind(this)
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const { type, id, payload } = event.data
    const pending = this.pendingRequests.get(id)

    if (!pending) return

    switch (type) {
      case 'result':
        pending.resolve(payload)
        this.pendingRequests.delete(id)
        break
      case 'progress':
        pending.onProgress?.(payload as ProgressPayload)
        break
      case 'error':
        pending.reject(new Error((payload as ErrorPayload).message))
        this.pendingRequests.delete(id)
        break
      case 'cancelled':
        pending.reject(new Error('Processing cancelled'))
        this.pendingRequests.delete(id)
        break
    }
  }

  async analyzeFont(
    fileData: Uint8Array,
    fileName: string
  ): Promise<FontAnalysis> {
    const id = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
      this.worker.postMessage({
        type: 'analyze',
        id,
        payload: { fileData, fileName }
      })
    })
  }

  async subsetFont(
    fileData: Uint8Array,
    fileName: string,
    options: SubsetOptions,
    onProgress?: (progress: ProgressPayload) => void
  ): Promise<SubsetResult> {
    const id = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress })
      this.worker.postMessage({
        type: 'subset',
        id,
        payload: { fileData, fileName, options }
      })
    })
  }

  cancelProcessing(id: string) {
    this.worker.postMessage({ type: 'cancel', id, payload: {} })
  }

  terminate() {
    this.worker.terminate()
  }
}

// シングルトンインスタンス
export const fontProcessor = new FontProcessor()
```

---

## 3. ファイル処理設計

### 3.1 ファイル入力

```typescript
// src/web/services/fileHandler.ts

export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer
      resolve(new Uint8Array(arrayBuffer))
    }

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`))
    }

    reader.readAsArrayBuffer(file)
  })
}

export function validateFontFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['.ttf', '.otf', '.woff', '.woff2']
  const maxSize = 100 * 1024 * 1024 // 100MB

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validExtensions.includes(ext)) {
    return { valid: false, error: 'INVALID_FILE' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'FILE_TOO_LARGE' }
  }

  return { valid: true }
}
```

### 3.2 ファイル出力（ダウンロード）

```typescript
// src/web/services/downloadManager.ts

export function downloadFile(data: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // メモリ解放
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function getMimeType(format: OutputFormat): string {
  const mimeTypes: Record<OutputFormat, string> = {
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2'
  }
  return mimeTypes[format]
}

export function generateOutputFileName(
  originalName: string,
  format: OutputFormat
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  return `${baseName}-subset.${format}`
}
```

### 3.3 File System Access API（オプション）

```typescript
// src/web/services/fileSystemAccess.ts

// File System Access APIが利用可能かチェック
export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window
}

export async function saveWithFilePicker(
  data: Uint8Array,
  suggestedName: string,
  format: OutputFormat
): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    return false
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: 'Font File',
        accept: { [getMimeType(format)]: [`.${format}`] }
      }]
    })

    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()

    return true
  } catch (error) {
    if (error.name === 'AbortError') {
      return false // ユーザーがキャンセル
    }
    throw error
  }
}
```

---

## 4. 状態管理設計

### 4.1 Zustand Store修正

既存の `src/renderer/stores/fontStore/` を修正して流用する。

**変更点**:
- ElectronAPI呼び出し → FontProcessor呼び出し
- `filePath: string` → `fileId: string` + `fileData: Uint8Array`

```typescript
// src/web/stores/fontStore/state.ts

interface FontStoreState {
  // ファイル関連（変更）
  files: Map<string, {
    file: File
    data: Uint8Array | null  // 読み込み済みデータ
    analysis: FontAnalysis | null
    status: 'pending' | 'analyzing' | 'ready' | 'error'
    error?: string
  }>

  // 処理状態（ほぼ同じ）
  isProcessing: boolean
  currentProcessingId: string | null
  progressState: ProgressState | null

  // エラー（同じ）
  errors: AppError[]

  // UI設定（同じ）
  selectedPreset: string
  customCharacters: string
  outputFormat: OutputFormat
  enableWoff2Compression: boolean

  // バリアブルフォント（同じ）
  variationAxesValues: Record<string, number>
  pinVariationAxes: boolean
}
```

### 4.2 アクション修正

```typescript
// src/web/stores/fontStore/actions.ts

import { fontProcessor } from '@web/services/fontProcessor'
import { readFileAsUint8Array, validateFontFile } from '@web/services/fileHandler'

export const createFileActions = (set, get) => ({
  // ファイル追加（File APIベース）
  async addFiles(files: File[]) {
    for (const file of files) {
      const validation = validateFontFile(file)
      if (!validation.valid) {
        get().addError({ code: validation.error!, message: file.name })
        continue
      }

      const fileId = crypto.randomUUID()

      // 初期状態を追加
      set((state) => ({
        files: new Map(state.files).set(fileId, {
          file,
          data: null,
          analysis: null,
          status: 'pending'
        })
      }))

      // 非同期で読み込み・解析
      try {
        set((state) => {
          const files = new Map(state.files)
          const entry = files.get(fileId)!
          files.set(fileId, { ...entry, status: 'analyzing' })
          return { files }
        })

        const data = await readFileAsUint8Array(file)
        const analysis = await fontProcessor.analyzeFont(data, file.name)

        set((state) => {
          const files = new Map(state.files)
          files.set(fileId, {
            file,
            data,
            analysis,
            status: 'ready'
          })
          return { files }
        })
      } catch (error) {
        set((state) => {
          const files = new Map(state.files)
          const entry = files.get(fileId)!
          files.set(fileId, {
            ...entry,
            status: 'error',
            error: error.message
          })
          return { files }
        })
      }
    }
  },

  removeFile(fileId: string) {
    set((state) => {
      const files = new Map(state.files)
      files.delete(fileId)
      return { files }
    })
  },

  clearFiles() {
    set({ files: new Map() })
  }
})

export const createProcessingActions = (set, get) => ({
  async processFont(fileId: string) {
    const entry = get().files.get(fileId)
    if (!entry?.data || !entry.analysis) return

    set({
      isProcessing: true,
      currentProcessingId: fileId,
      progressState: { stage: 'preparing', progress: 0, message: '準備中...' }
    })

    try {
      const result = await fontProcessor.subsetFont(
        entry.data,
        entry.file.name,
        get().getSubsetOptions(),
        (progress) => set({ progressState: progress })
      )

      // ダウンロード
      downloadFile(
        result.data,
        result.fileName,
        getMimeType(get().outputFormat)
      )

      set({
        isProcessing: false,
        currentProcessingId: null,
        progressState: null
      })
    } catch (error) {
      set({
        isProcessing: false,
        currentProcessingId: null,
        progressState: null
      })
      get().addError({ code: 'PROCESS_ERROR', message: error.message })
    }
  },

  cancelProcessing() {
    const { currentProcessingId } = get()
    if (currentProcessingId) {
      fontProcessor.cancelProcessing(currentProcessingId)
    }
  }
})
```

---

## 5. UIコンポーネント修正

### 5.1 FileDropZone修正

```typescript
// src/web/components/FileDropZone.tsx
// 既存のFileDropZone.tsxを修正

const handleFileDrop = async (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragOver(false)

  const files = Array.from(e.dataTransfer.files)
  await addFiles(files)  // File[]を直接渡す
}

const handleFileSelect = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = '.ttf,.otf,.woff,.woff2'

  input.onchange = async () => {
    const files = Array.from(input.files || [])
    await addFiles(files)
  }

  input.click()
}
```

### 5.2 useFontProcessing修正

```typescript
// src/web/hooks/useFontProcessing.ts

export function useFontProcessing() {
  const {
    files,
    isProcessing,
    progressState,
    processFont,
    cancelProcessing,
    outputFormat
  } = useFontStore()

  const handleProcess = async (fileId: string) => {
    await processFont(fileId)
  }

  const handleCancel = () => {
    cancelProcessing()
  }

  return {
    files,
    isProcessing,
    progressState,
    handleProcess,
    handleCancel
  }
}
```

---

## 6. ビルド設定

### 6.1 Vite設定（Web版）

```typescript
// src/web/vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/web',
  base: './',
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../'),
      '@web': resolve(__dirname, './'),
      '@shared': resolve(__dirname, '../shared'),
      '@lib': resolve(__dirname, '../lib'),
      '@renderer': resolve(__dirname, '../renderer')
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['subset-font']  // WASMを含むので除外
  }
})
```

### 6.2 package.json scripts追加

```json
{
  "scripts": {
    "dev:web": "vite --config src/web/vite.config.ts",
    "build:web": "vite build --config src/web/vite.config.ts",
    "preview:web": "vite preview --config src/web/vite.config.ts"
  }
}
```

---

## 7. フォント処理ライブラリ移植

### 7.1 fontAnalyzer修正

```typescript
// src/lib/fontAnalyzer.ts

// 変更前（Electron版）
import fs from 'fs'
export async function analyzeFont(filePath: string): Promise<FontAnalysis>

// 変更後（Web版）
export async function analyzeFont(
  data: Uint8Array,
  fileName: string
): Promise<FontAnalysis> {
  // fs.readFileSync → 引数で受け取る
  // Buffer → Uint8Array（fontkitは両対応）

  const font = await fontkit.create(data)
  // ... 以下の解析ロジックはほぼ同じ
}
```

### 7.2 fontSubsetter修正

**重要**: `subset-font`ライブラリはNode.js専用（`require('fs')`依存）のため、Web版では`harfbuzzjs`のWASMを直接使用する。

```typescript
// src/lib/fontSubsetter.ts (Web版)

// harfbuzzjs WASMを直接使用
let wasmExports: WebAssembly.Exports | null = null

async function initWasm(): Promise<void> {
  if (wasmExports) return

  const response = await fetch('/wasm/hb-subset.wasm')
  const wasmBuffer = await response.arrayBuffer()
  const { instance } = await WebAssembly.instantiate(wasmBuffer)
  wasmExports = instance.exports
}

export async function subsetFont(
  data: Uint8Array,
  text: string,
  options: SubsetOptions,
  progressCallback?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<SubsetResult> {
  await initWasm()

  if (abortSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const exports = wasmExports!
  const heapu8 = new Uint8Array((exports.memory as WebAssembly.Memory).buffer)

  // フォントデータをWASMメモリにコピー
  const fontBuffer = (exports.malloc as Function)(data.byteLength)
  heapu8.set(data, fontBuffer)

  // harfbuzz APIを直接呼び出し
  const blob = (exports.hb_blob_create as Function)(fontBuffer, data.byteLength, 2, 0, 0)
  const face = (exports.hb_face_create as Function)(blob, 0)
  const input = (exports.hb_subset_input_create_or_fail as Function)()
  const unicodeSet = (exports.hb_subset_input_unicode_set as Function)(input)

  // 文字をUnicodeセットに追加
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint) (exports.hb_set_add as Function)(unicodeSet, codePoint)
  }

  // サブセット実行
  const subset = (exports.hb_subset_or_fail as Function)(face, input)
  // ... 結果取得・クリーンアップ

  return {
    data: resultData,
    originalSize: data.length,
    outputSize: resultData.length,
    fileName: generateOutputFileName(options.fileName, options.outputFormat)
  }
}
```

**参考**: PoCコード `poc/main.ts` に完全な実装例あり

---

## 8. デプロイ設計

### 8.1 静的ファイル構成

```
dist-web/
├── index.html
├── assets/
│   ├── index-[hash].js      # メインバンドル
│   ├── index-[hash].css     # スタイル
│   └── font.worker-[hash].js # Web Worker
└── wasm/
    └── harfbuzzjs.wasm       # WASM（~750KB）
```

### 8.2 ホスティング設定例（Vercel）

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    }
  ]
}
```

### 8.3 GitHub Actions（CI/CD）

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'src/web/**'
      - 'src/shared/**'
      - 'src/lib/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:web
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist-web
```

---

## 9. エラーハンドリング設計

### 9.1 エラー階層

```typescript
// src/shared/errors.ts に追加

export class FontProcessingError extends Error {
  code: string
  details?: string

  constructor(code: string, message: string, details?: string) {
    super(message)
    this.name = 'FontProcessingError'
    this.code = code
    this.details = details
  }
}

export const ErrorCodes = {
  // ファイル関連
  INVALID_FILE: 'INVALID_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_READ_ERROR: 'FILE_READ_ERROR',

  // 解析関連
  PARSE_ERROR: 'PARSE_ERROR',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',

  // 処理関連
  SUBSET_ERROR: 'SUBSET_ERROR',
  COMPRESSION_ERROR: 'COMPRESSION_ERROR',
  CANCELLED: 'CANCELLED',

  // システム関連
  MEMORY_ERROR: 'MEMORY_ERROR',
  WORKER_ERROR: 'WORKER_ERROR',
  WASM_LOAD_ERROR: 'WASM_LOAD_ERROR'
} as const
```

### 9.2 エラーメッセージマップ

```typescript
export const ErrorMessages: Record<string, string> = {
  INVALID_FILE: '対応していないファイル形式です。TTF, OTF, WOFF, WOFF2形式のフォントを選択してください。',
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます。100MB以下のファイルを選択してください。',
  FILE_READ_ERROR: 'ファイルの読み込みに失敗しました。',
  PARSE_ERROR: 'フォントの解析に失敗しました。ファイルが破損している可能性があります。',
  SUBSET_ERROR: 'サブセット化に失敗しました。',
  MEMORY_ERROR: 'メモリ不足です。ブラウザを再起動してください。',
  WORKER_ERROR: '処理中にエラーが発生しました。ページを再読み込みしてください。',
  WASM_LOAD_ERROR: '処理エンジンの読み込みに失敗しました。ネットワーク接続を確認してください。'
}
```

---

## 10. テスト設計

### 10.1 ユニットテスト

```typescript
// src/lib/__tests__/fontAnalyzer.test.ts

import { analyzeFont } from '../fontAnalyzer'
import { readFileSync } from 'fs'

describe('fontAnalyzer (Web版)', () => {
  it('Uint8Arrayからフォントを解析できる', async () => {
    const buffer = readFileSync('test/fixtures/test-font.ttf')
    const data = new Uint8Array(buffer)

    const result = await analyzeFont(data, 'test-font.ttf')

    expect(result.fontName).toBeDefined()
    expect(result.glyphCount).toBeGreaterThan(0)
  })
})
```

### 10.2 Web Worker テスト

```typescript
// src/web/workers/__tests__/font.worker.test.ts

import { describe, it, expect } from 'vitest'

describe('FontWorker', () => {
  it('解析リクエストを処理できる', async () => {
    const worker = new Worker(
      new URL('../font.worker.ts', import.meta.url),
      { type: 'module' }
    )

    const result = await new Promise((resolve) => {
      worker.onmessage = (e) => resolve(e.data)
      worker.postMessage({
        type: 'analyze',
        id: 'test-1',
        payload: { fileData: testFontData, fileName: 'test.ttf' }
      })
    })

    expect(result.type).toBe('result')
  })
})
```

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2024-12-14 | 初版作成 |
| 2024-12-14 | PoC検証結果を反映。subset-font→harfbuzzjs直接使用に設計変更 |
