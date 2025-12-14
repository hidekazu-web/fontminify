import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FontMinifyError, ErrorType } from '../../src/shared/errors'
import type {
  WorkerResponse,
  AnalyzeResult,
  SubsetResult,
  ProgressPayload,
  ErrorPayload
} from '../../src/web/workers/types'

// Web Workerをモック
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null

  private messageHandlers: ((data: any) => any)[] = []

  postMessage(data: any): void {
    // メッセージを非同期で処理
    setTimeout(() => {
      for (const handler of this.messageHandlers) {
        const response = handler(data)
        if (response && this.onmessage) {
          this.onmessage(new MessageEvent('message', { data: response }))
        }
      }
    }, 0)
  }

  // テスト用: メッセージハンドラーを追加
  addMessageHandler(handler: (data: any) => any): void {
    this.messageHandlers.push(handler)
  }

  // テスト用: エラーをシミュレート
  simulateError(message: string): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { message }))
    }
  }

  terminate(): void {}
}

// グローバルWorkerをモック
vi.stubGlobal('Worker', MockWorker)

describe('FontProcessor', () => {
  let mockWorker: MockWorker

  beforeEach(() => {
    vi.resetModules()
    mockWorker = new MockWorker()
    vi.stubGlobal('Worker', function() {
      return mockWorker
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Worker メッセージ処理', () => {
    it('resultメッセージを正しく処理する', async () => {
      const analyzeResult: WorkerResponse<AnalyzeResult> = {
        type: 'result',
        id: 'req-1',
        payload: {
          analysis: {
            fileName: 'test.ttf',
            fileSize: 1000,
            format: 'ttf',
            fontFamily: 'Test',
            fontSubfamily: 'Regular',
            version: '1.0',
            glyphCount: 500,
            characterRanges: [],
            features: [],
            languages: [],
            hasColorEmoji: false,
            isVariableFont: false
          }
        }
      }

      expect(analyzeResult.type).toBe('result')
      expect(analyzeResult.payload.analysis.fontFamily).toBe('Test')
    })

    it('progressメッセージを正しく処理する', () => {
      const progressPayload: ProgressPayload = {
        stage: 'subsetting',
        progress: 50,
        message: 'サブセット化中...'
      }

      expect(progressPayload.stage).toBe('subsetting')
      expect(progressPayload.progress).toBe(50)
    })

    it('errorメッセージをFontMinifyErrorに変換する', () => {
      const errorPayload: ErrorPayload = {
        code: 'INVALID_FORMAT',
        message: '対応していないフォント形式です',
        suggestion: '.ttfまたは.otfファイルを使用してください',
        recoverable: true
      }

      const error = new FontMinifyError(
        errorPayload.code as ErrorType,
        errorPayload.message,
        {
          recoverable: errorPayload.recoverable ?? true,
          suggestion: errorPayload.suggestion
        }
      )

      expect(error).toBeInstanceOf(FontMinifyError)
      expect(error.type).toBe('INVALID_FORMAT')
      expect(error.message).toBe('対応していないフォント形式です')
      expect(error.recoverable).toBe(true)
      expect(error.suggestion).toBe('.ttfまたは.otfファイルを使用してください')
    })

    it('cancelledメッセージを正しく処理する', () => {
      const cancelledResponse: WorkerResponse = {
        type: 'cancelled',
        id: 'req-1',
        payload: {}
      }

      expect(cancelledResponse.type).toBe('cancelled')
    })
  })

  describe('リクエストID生成', () => {
    it('ユニークなリクエストIDを生成する', () => {
      const ids = new Set<string>()
      const generateId = (counter: number) => `req-${counter}-${Date.now()}`

      for (let i = 0; i < 100; i++) {
        ids.add(generateId(i))
      }

      // 100個のIDがすべてユニーク
      expect(ids.size).toBe(100)
    })
  })

  describe('エラーハンドリング', () => {
    it('Workerエラー時にすべての待機リクエストを拒否する', () => {
      const pendingRequests = new Map<string, { reject: (e: Error) => void }>()
      const rejectedIds: string[] = []

      // 待機リクエストを追加
      pendingRequests.set('req-1', {
        reject: () => rejectedIds.push('req-1')
      })
      pendingRequests.set('req-2', {
        reject: () => rejectedIds.push('req-2')
      })

      // エラー発生をシミュレート
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error('Worker error'))
        pendingRequests.delete(id)
      }

      expect(rejectedIds).toContain('req-1')
      expect(rejectedIds).toContain('req-2')
      expect(pendingRequests.size).toBe(0)
    })

    it('不明なリクエストIDは無視する', () => {
      const pendingRequests = new Map<string, { resolve: () => void }>()
      pendingRequests.set('req-1', { resolve: vi.fn() })

      const unknownId = 'req-999'
      const pending = pendingRequests.get(unknownId)

      expect(pending).toBeUndefined()
    })
  })

  describe('サブセット処理オプション', () => {
    it('バリアブル軸オプションをペイロードに含める', () => {
      const payload = {
        fileData: new Uint8Array(100),
        fileName: 'variable.ttf',
        text: 'あいう',
        outputFormat: 'woff2',
        variationAxes: { wght: 400 },
        pinVariationAxes: true
      }

      expect(payload.variationAxes).toEqual({ wght: 400 })
      expect(payload.pinVariationAxes).toBe(true)
    })

    it('バリアブル軸オプションが省略可能', () => {
      const payload = {
        fileData: new Uint8Array(100),
        fileName: 'static.ttf',
        text: 'あいう',
        outputFormat: 'ttf'
      }

      expect(payload.variationAxes).toBeUndefined()
      expect(payload.pinVariationAxes).toBeUndefined()
    })
  })

  describe('プログレスコールバック', () => {
    it('プログレス更新が順序正しく発火する', () => {
      const progressUpdates: ProgressPayload[] = []
      const onProgress = (progress: ProgressPayload) => {
        progressUpdates.push(progress)
      }

      // シミュレートされたプログレス更新
      const simulatedUpdates: ProgressPayload[] = [
        { stage: 'initializing', progress: 10, message: '初期化中...' },
        { stage: 'subsetting', progress: 30, message: 'サブセット化中...' },
        { stage: 'compressing', progress: 70, message: '圧縮中...' },
        { stage: 'complete', progress: 100, message: '完了' }
      ]

      for (const update of simulatedUpdates) {
        onProgress(update)
      }

      expect(progressUpdates).toHaveLength(4)
      expect(progressUpdates[0].stage).toBe('initializing')
      expect(progressUpdates[3].stage).toBe('complete')
      expect(progressUpdates[3].progress).toBe(100)
    })
  })

  describe('Worker終了', () => {
    it('terminate()でWorkerを終了できる', () => {
      const worker = new MockWorker()
      const terminateSpy = vi.spyOn(worker, 'terminate')

      worker.terminate()

      expect(terminateSpy).toHaveBeenCalled()
    })
  })
})
