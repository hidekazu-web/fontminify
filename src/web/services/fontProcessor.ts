import { FontAnalysis, OutputFormat } from '../../shared/types'
import { FontMinifyError, ErrorType } from '../../shared/errors'
import type {
  WorkerRequest,
  WorkerResponse,
  AnalyzePayload,
  SubsetPayload,
  AnalyzeResult,
  SubsetResult,
  ProgressPayload,
  ErrorPayload
} from '../workers/types'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  onProgress?: (progress: ProgressPayload) => void
}

/**
 * WorkerからのエラーペイロードをFontMinifyErrorに変換
 */
function createErrorFromPayload(payload: ErrorPayload): FontMinifyError {
  return new FontMinifyError(
    (payload.code as ErrorType) || ErrorType.UNKNOWN_ERROR,
    payload.message,
    {
      recoverable: payload.recoverable ?? true,
      suggestion: payload.suggestion
    }
  )
}

/**
 * フォント処理Worker APIブリッジ
 */
class FontProcessor {
  private worker: Worker
  private pendingRequests: Map<string, PendingRequest>
  private requestIdCounter: number = 0

  constructor() {
    this.worker = new Worker(
      new URL('../workers/font.worker.ts', import.meta.url),
      { type: 'module' }
    )
    this.pendingRequests = new Map()
    this.worker.onmessage = this.handleMessage.bind(this)
    this.worker.onerror = this.handleError.bind(this)
  }

  private generateId(): string {
    return `req-${++this.requestIdCounter}-${Date.now()}`
  }

  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const { type, id, payload } = event.data
    const pending = this.pendingRequests.get(id)

    if (!pending) {
      console.warn('[FontProcessor] Unknown request ID:', id)
      return
    }

    switch (type) {
      case 'result':
        pending.resolve(payload)
        this.pendingRequests.delete(id)
        break

      case 'progress':
        pending.onProgress?.(payload as ProgressPayload)
        break

      case 'error': {
        const errorPayload = payload as ErrorPayload
        pending.reject(createErrorFromPayload(errorPayload))
        this.pendingRequests.delete(id)
        break
      }

      case 'cancelled':
        pending.reject(new FontMinifyError(
          ErrorType.UNKNOWN_ERROR,
          '処理がキャンセルされました',
          { recoverable: true }
        ))
        this.pendingRequests.delete(id)
        break
    }
  }

  private handleError(event: ErrorEvent): void {
    console.error('[FontProcessor] Worker error:', event)
    // すべての待機中リクエストを拒否
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new FontMinifyError(
        ErrorType.UNKNOWN_ERROR,
        'Workerエラー: ' + event.message,
        {
          recoverable: false,
          suggestion: 'ページを再読み込みしてください。'
        }
      ))
      this.pendingRequests.delete(id)
    }
  }

  private sendRequest<T>(
    type: WorkerRequest['type'],
    payload: unknown,
    onProgress?: (progress: ProgressPayload) => void
  ): Promise<T> {
    const id = this.generateId()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onProgress
      })

      this.worker.postMessage({
        type,
        id,
        payload
      } as WorkerRequest)
    })
  }

  /**
   * フォントを解析
   */
  async analyzeFont(
    fileData: Uint8Array,
    fileName: string
  ): Promise<FontAnalysis> {
    const payload: AnalyzePayload = { fileData, fileName }
    const result = await this.sendRequest<AnalyzeResult>('analyze', payload)
    return result.analysis
  }

  /**
   * フォントをサブセット化
   */
  async subsetFont(
    fileData: Uint8Array,
    fileName: string,
    text: string,
    outputFormat: OutputFormat,
    onProgress?: (progress: ProgressPayload) => void,
    options?: {
      variationAxes?: Record<string, number>
      pinVariationAxes?: boolean
    }
  ): Promise<SubsetResult> {
    const payload: SubsetPayload = {
      fileData,
      fileName,
      text,
      outputFormat,
      ...options
    }

    return this.sendRequest<SubsetResult>('subset', payload, onProgress)
  }

  /**
   * 処理をキャンセル
   */
  cancelProcessing(requestId: string): void {
    this.worker.postMessage({
      type: 'cancel',
      id: requestId,
      payload: {}
    } as WorkerRequest)
  }

  /**
   * Workerを終了
   */
  terminate(): void {
    this.worker.terminate()
  }
}

// シングルトンインスタンス
export const fontProcessor = new FontProcessor()
