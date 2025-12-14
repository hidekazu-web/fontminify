import { analyzeFont } from '../../lib/fontAnalyzer'
import { subsetFont } from '../../lib/fontSubsetter'
import { handleError, ErrorType } from '../../shared/errors'
import type {
  WorkerRequest,
  WorkerResponse,
  AnalyzePayload,
  SubsetPayload,
  AnalyzeResult,
  SubsetResult,
  ProgressPayload,
  ErrorPayload
} from './types'

// 処理中のリクエストを管理
const activeRequests = new Map<string, AbortController>()

// 型安全なpostMessage
function postResponse<T>(response: WorkerResponse<T>): void {
  self.postMessage(response)
}

// 解析処理
async function handleAnalyze(id: string, payload: AnalyzePayload): Promise<void> {
  const controller = new AbortController()
  activeRequests.set(id, controller)

  try {
    console.log('[Worker] Starting analysis for:', payload.fileName)

    const analysis = await analyzeFont(payload.fileData, payload.fileName)

    postResponse<AnalyzeResult>({
      type: 'result',
      id,
      payload: { analysis }
    })
  } catch (error) {
    const appError = handleError(error, payload.fileName)
    console.error('[Worker] Analysis error:', appError.message)

    postResponse<ErrorPayload>({
      type: 'error',
      id,
      payload: {
        code: appError.type,
        message: appError.message,
        details: appError.cause?.message,
        suggestion: appError.suggestion,
        recoverable: appError.recoverable
      }
    })
  } finally {
    activeRequests.delete(id)
  }
}

// サブセット処理
async function handleSubset(id: string, payload: SubsetPayload): Promise<void> {
  const controller = new AbortController()
  activeRequests.set(id, controller)

  try {
    console.log('[Worker] Starting subset for:', payload.fileName)
    console.log('[Worker] Text length:', payload.text.length)

    const result = await subsetFont(
      payload.fileData,
      {
        text: payload.text,
        outputFormat: payload.outputFormat,
        fileName: payload.fileName,
        variationAxes: payload.variationAxes,
        pinVariationAxes: payload.pinVariationAxes
      },
      // プログレスコールバック
      (progress) => {
        postResponse<ProgressPayload>({
          type: 'progress',
          id,
          payload: progress
        })
      },
      controller.signal
    )

    postResponse<SubsetResult>({
      type: 'result',
      id,
      payload: result
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      postResponse({
        type: 'cancelled',
        id,
        payload: {}
      })
    } else {
      const appError = handleError(error, payload.fileName)
      console.error('[Worker] Subset error:', appError.message)

      postResponse<ErrorPayload>({
        type: 'error',
        id,
        payload: {
          code: appError.type,
          message: appError.message,
          details: appError.cause?.message,
          suggestion: appError.suggestion,
          recoverable: appError.recoverable
        }
      })
    }
  } finally {
    activeRequests.delete(id)
  }
}

// キャンセル処理
function handleCancel(id: string): void {
  const controller = activeRequests.get(id)
  if (controller) {
    console.log('[Worker] Cancelling request:', id)
    controller.abort()
  }
}

// メッセージハンドラー
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, id, payload } = event.data

  console.log('[Worker] Received message:', type, id)

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
    default:
      console.warn('[Worker] Unknown message type:', type)
  }
}

// Worker初期化完了
console.log('[Worker] Font worker initialized')
