import { describe, it, expect } from 'vitest'
import type {
  WorkerRequest,
  WorkerResponse,
  AnalyzePayload,
  SubsetPayload,
  AnalyzeResult,
  SubsetResult,
  ProgressPayload,
  ErrorPayload
} from '../../src/web/workers/types'

describe('Worker Types', () => {
  describe('WorkerRequest', () => {
    it('AnalyzePayloadの型が正しい', () => {
      const payload: AnalyzePayload = {
        fileData: new Uint8Array([0x00, 0x01]),
        fileName: 'test.ttf'
      }

      expect(payload.fileData).toBeInstanceOf(Uint8Array)
      expect(payload.fileName).toBe('test.ttf')
    })

    it('SubsetPayloadの型が正しい', () => {
      const payload: SubsetPayload = {
        fileData: new Uint8Array([0x00, 0x01]),
        fileName: 'test.ttf',
        text: 'あいうえお',
        outputFormat: 'woff2'
      }

      expect(payload.fileData).toBeInstanceOf(Uint8Array)
      expect(payload.fileName).toBe('test.ttf')
      expect(payload.text).toBe('あいうえお')
      expect(payload.outputFormat).toBe('woff2')
    })

    it('SubsetPayloadにバリアブル軸オプションを含められる', () => {
      const payload: SubsetPayload = {
        fileData: new Uint8Array([0x00, 0x01]),
        fileName: 'variable.ttf',
        text: 'テスト',
        outputFormat: 'ttf',
        variationAxes: { wght: 400, wdth: 100 },
        pinVariationAxes: true
      }

      expect(payload.variationAxes).toEqual({ wght: 400, wdth: 100 })
      expect(payload.pinVariationAxes).toBe(true)
    })

    it('WorkerRequestの型が正しい', () => {
      const request: WorkerRequest<AnalyzePayload> = {
        type: 'analyze',
        id: 'request-123',
        payload: {
          fileData: new Uint8Array([0x00]),
          fileName: 'test.ttf'
        }
      }

      expect(request.type).toBe('analyze')
      expect(request.id).toBe('request-123')
      expect(request.payload.fileName).toBe('test.ttf')
    })
  })

  describe('WorkerResponse', () => {
    it('AnalyzeResultの型が正しい', () => {
      const result: AnalyzeResult = {
        analysis: {
          fileName: 'test.ttf',
          fileSize: 1000,
          format: 'ttf',
          fontFamily: 'Test Font',
          fontSubfamily: 'Regular',
          version: '1.0',
          glyphCount: 500,
          characterRanges: [],
          features: [],
          languages: ['ja', 'en'],
          hasColorEmoji: false,
          isVariableFont: false
        }
      }

      expect(result.analysis.fileName).toBe('test.ttf')
      expect(result.analysis.format).toBe('ttf')
    })

    it('SubsetResultの型が正しい', () => {
      const result: SubsetResult = {
        data: new Uint8Array([0x00, 0x01]),
        originalSize: 1000,
        outputSize: 500,
        fileName: 'test-subset.woff2'
      }

      expect(result.data).toBeInstanceOf(Uint8Array)
      expect(result.originalSize).toBe(1000)
      expect(result.outputSize).toBe(500)
      expect(result.fileName).toBe('test-subset.woff2')
    })

    it('ProgressPayloadの型が正しい', () => {
      const progress: ProgressPayload = {
        stage: 'subsetting',
        progress: 50,
        message: 'サブセット化中...'
      }

      expect(progress.stage).toBe('subsetting')
      expect(progress.progress).toBe(50)
      expect(progress.message).toBe('サブセット化中...')
    })

    it('ErrorPayloadの型が正しい', () => {
      const error: ErrorPayload = {
        code: 'INVALID_FORMAT',
        message: '対応していないフォント形式です',
        details: 'Expected TTF or OTF format',
        suggestion: '.ttfまたは.otfファイルを使用してください',
        recoverable: true
      }

      expect(error.code).toBe('INVALID_FORMAT')
      expect(error.message).toBe('対応していないフォント形式です')
      expect(error.recoverable).toBe(true)
    })

    it('WorkerResponseの型が正しい', () => {
      const response: WorkerResponse<SubsetResult> = {
        type: 'result',
        id: 'request-123',
        payload: {
          data: new Uint8Array([0x00]),
          originalSize: 1000,
          outputSize: 500,
          fileName: 'test-subset.ttf'
        }
      }

      expect(response.type).toBe('result')
      expect(response.id).toBe('request-123')
      expect(response.payload.outputSize).toBe(500)
    })
  })

  describe('リクエスト/レスポンス整合性', () => {
    it('analyze リクエストとレスポンスが対応する', () => {
      const request: WorkerRequest<AnalyzePayload> = {
        type: 'analyze',
        id: 'analyze-001',
        payload: {
          fileData: new Uint8Array(100),
          fileName: 'font.ttf'
        }
      }

      const response: WorkerResponse<AnalyzeResult> = {
        type: 'result',
        id: request.id,
        payload: {
          analysis: {
            fileName: 'font.ttf',
            fileSize: 100,
            format: 'ttf',
            fontFamily: 'Font',
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

      expect(response.id).toBe(request.id)
      expect(response.payload.analysis.fileName).toBe(request.payload.fileName)
    })

    it('subset リクエストとレスポンスが対応する', () => {
      const request: WorkerRequest<SubsetPayload> = {
        type: 'subset',
        id: 'subset-001',
        payload: {
          fileData: new Uint8Array(1000),
          fileName: 'font.ttf',
          text: 'あいう',
          outputFormat: 'woff2'
        }
      }

      const response: WorkerResponse<SubsetResult> = {
        type: 'result',
        id: request.id,
        payload: {
          data: new Uint8Array(500),
          originalSize: 1000,
          outputSize: 500,
          fileName: 'font-subset.woff2'
        }
      }

      expect(response.id).toBe(request.id)
      expect(response.payload.originalSize).toBe(request.payload.fileData.length)
    })

    it('cancel リクエストとcancelled レスポンスが対応する', () => {
      const cancelRequest: WorkerRequest = {
        type: 'cancel',
        id: 'subset-001',
        payload: {}
      }

      const cancelledResponse: WorkerResponse = {
        type: 'cancelled',
        id: cancelRequest.id,
        payload: {}
      }

      expect(cancelledResponse.id).toBe(cancelRequest.id)
      expect(cancelledResponse.type).toBe('cancelled')
    })

    it('エラーレスポンスが正しく生成される', () => {
      const request: WorkerRequest<AnalyzePayload> = {
        type: 'analyze',
        id: 'analyze-002',
        payload: {
          fileData: new Uint8Array(0),
          fileName: 'empty.ttf'
        }
      }

      const errorResponse: WorkerResponse<ErrorPayload> = {
        type: 'error',
        id: request.id,
        payload: {
          code: 'INVALID_FORMAT',
          message: 'ファイルが空です',
          recoverable: true
        }
      }

      expect(errorResponse.type).toBe('error')
      expect(errorResponse.id).toBe(request.id)
      expect(errorResponse.payload.code).toBe('INVALID_FORMAT')
    })
  })

  describe('プログレス更新シーケンス', () => {
    it('正しいプログレス更新シーケンスを持つ', () => {
      const expectedStages = [
        { stage: 'initializing', progress: 10 },
        { stage: 'subsetting', progress: 30 },
        { stage: 'compressing', progress: 70 },
        { stage: 'complete', progress: 100 }
      ]

      const progressUpdates: ProgressPayload[] = expectedStages.map(s => ({
        stage: s.stage,
        progress: s.progress,
        message: `${s.stage}...`
      }))

      // プログレスが単調増加することを確認
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].progress).toBeGreaterThan(
          progressUpdates[i - 1].progress
        )
      }

      // 最終プログレスが100であることを確認
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100)
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete')
    })
  })
})
