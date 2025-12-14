import { FontAnalysis, OutputFormat } from '../../shared/types'

// リクエストの種類
export type WorkerRequestType = 'analyze' | 'subset' | 'cancel'

// メインスレッド → Worker
export interface WorkerRequest<T = unknown> {
  type: WorkerRequestType
  id: string
  payload: T
}

export interface AnalyzePayload {
  fileData: Uint8Array
  fileName: string
}

export interface SubsetPayload {
  fileData: Uint8Array
  fileName: string
  text: string
  outputFormat: OutputFormat
  variationAxes?: Record<string, number>
  pinVariationAxes?: boolean
}

// Worker → メインスレッド
export type WorkerResponseType = 'result' | 'progress' | 'error' | 'cancelled'

export interface WorkerResponse<T = unknown> {
  type: WorkerResponseType
  id: string
  payload: T
}

export interface AnalyzeResult {
  analysis: FontAnalysis
}

export interface SubsetResult {
  data: Uint8Array
  originalSize: number
  outputSize: number
  fileName: string
}

export interface ProgressPayload {
  stage: string
  progress: number
  message: string
}

export interface ErrorPayload {
  code: string
  message: string
  details?: string
}
