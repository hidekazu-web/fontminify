import { create } from 'zustand'
import { FontAnalysis, OutputFormat } from '../../../shared/types'
import { AppError, handleError } from '../../../shared/errors'
import { getCharacterSetFromPreset, getUniqueCharacters } from '../../../shared/presets'
import { fontProcessor } from '../../services/fontProcessor'
import { readFileAsUint8Array, validateFontFile } from '../../services/fileHandler'
import { smartDownload, getMimeType } from '../../services/downloadManager'
import type { ProgressPayload } from '../../workers/types'

/**
 * ファイルエントリの型
 */
export interface FileEntry {
  id: string
  file: File
  data: Uint8Array | null
  analysis: FontAnalysis | null
  status: 'pending' | 'analyzing' | 'ready' | 'error'
  error?: string
}

/**
 * Web版FontStoreの状態型
 */
interface FontStoreState {
  // ファイル状態
  files: Map<string, FileEntry>

  // 処理状態
  isProcessing: boolean
  currentProcessingId: string | null
  progressState: ProgressPayload | null

  // エラー状態
  errors: AppError[]

  // UI状態
  selectedPreset: string
  customCharacters: string
  outputFormat: OutputFormat
  isDragOver: boolean

  // バリアブルフォント状態
  variationAxesValues: Record<string, number>
  pinVariationAxes: boolean
}

/**
 * Web版FontStoreのアクション型
 */
interface FontStoreActions {
  // ファイル操作
  addFiles: (files: File[]) => Promise<void>
  removeFile: (fileId: string) => void
  clearFiles: () => void

  // 処理
  processFont: (fileId: string) => Promise<void>
  cancelProcessing: () => void

  // エラー管理
  addError: (error: AppError) => void
  removeError: (index: number) => void
  clearErrors: () => void

  // UI操作
  setSelectedPreset: (preset: string) => void
  setCustomCharacters: (characters: string) => void
  setOutputFormat: (format: OutputFormat) => void
  setDragOverState: (isDragOver: boolean) => void

  // バリアブルフォント
  setVariationAxesValues: (values: Record<string, number>) => void
  setPinVariationAxes: (pin: boolean) => void
  resetVariationAxesToDefaults: (axes: { tag: string; default: number }[]) => void

  // セレクタ
  getEffectiveCharacterSet: () => string
  getTotalCharacterCount: () => number
}

export type FontStore = FontStoreState & FontStoreActions

/**
 * Web版FontStore
 */
export const useFontStore = create<FontStore>((set, get) => ({
  // 初期状態
  files: new Map(),
  isProcessing: false,
  currentProcessingId: null,
  progressState: null,
  errors: [],
  selectedPreset: 'joyo-jis1',
  customCharacters: '',
  outputFormat: 'woff2',
  isDragOver: false,
  variationAxesValues: {},
  pinVariationAxes: true,

  // ファイル追加
  addFiles: async (files: File[]) => {
    for (const file of files) {
      // バリデーション
      const validation = validateFontFile(file)
      if (!validation.valid) {
        const error = handleError(new Error(validation.error), file.name)
        get().addError(error.toJSON())
        continue
      }

      const fileId = crypto.randomUUID()

      // 初期状態を追加
      set(state => {
        const newFiles = new Map(state.files)
        newFiles.set(fileId, {
          id: fileId,
          file,
          data: null,
          analysis: null,
          status: 'pending'
        })
        return { files: newFiles }
      })

      // 非同期で読み込み・解析
      try {
        // ステータス更新: analyzing
        set(state => {
          const newFiles = new Map(state.files)
          const entry = newFiles.get(fileId)
          if (entry) {
            newFiles.set(fileId, { ...entry, status: 'analyzing' })
          }
          return { files: newFiles }
        })

        // ファイル読み込み
        const data = await readFileAsUint8Array(file)

        // フォント解析
        const analysis = await fontProcessor.analyzeFont(data, file.name)

        // ステータス更新: ready
        set(state => {
          const newFiles = new Map(state.files)
          newFiles.set(fileId, {
            id: fileId,
            file,
            data,
            analysis,
            status: 'ready'
          })
          return { files: newFiles }
        })

        // バリアブルフォントの場合、軸のデフォルト値を設定
        if (analysis.isVariableFont && analysis.axes) {
          get().resetVariationAxesToDefaults(analysis.axes)
        }
      } catch (error) {
        // ステータス更新: error
        const errorMessage = error instanceof Error ? error.message : String(error)
        set(state => {
          const newFiles = new Map(state.files)
          const entry = newFiles.get(fileId)
          if (entry) {
            newFiles.set(fileId, {
              ...entry,
              status: 'error',
              error: errorMessage
            })
          }
          return { files: newFiles }
        })

        const appError = handleError(error, file.name)
        get().addError(appError.toJSON())
      }
    }
  },

  removeFile: (fileId: string) => {
    set(state => {
      const newFiles = new Map(state.files)
      newFiles.delete(fileId)
      return { files: newFiles }
    })
  },

  clearFiles: () => {
    set({
      files: new Map(),
      isProcessing: false,
      currentProcessingId: null,
      progressState: null
    })
  },

  // フォント処理
  processFont: async (fileId: string) => {
    const entry = get().files.get(fileId)
    if (!entry?.data || !entry.analysis) {
      console.error('File not ready for processing:', fileId)
      return
    }

    set({
      isProcessing: true,
      currentProcessingId: fileId,
      progressState: { stage: 'preparing', progress: 0, message: '準備中...' }
    })

    try {
      const characterSet = get().getEffectiveCharacterSet()
      const { outputFormat, variationAxesValues, pinVariationAxes } = get()

      const result = await fontProcessor.subsetFont(
        entry.data,
        entry.file.name,
        characterSet,
        outputFormat,
        (progress) => set({ progressState: progress }),
        { variationAxes: pinVariationAxes ? variationAxesValues : undefined, pinVariationAxes }
      )

      console.log('[Store] Subset complete, result:', {
        fileName: result.fileName,
        dataSize: result.data?.length,
        outputSize: result.outputSize
      })

      // ダウンロード
      console.log('[Store] Starting download...')
      await smartDownload(result.data, result.fileName, outputFormat)
      console.log('[Store] Download complete')

      set({
        isProcessing: false,
        currentProcessingId: null,
        progressState: null
      })
    } catch (error) {
      console.error('Processing error:', error)
      set({
        isProcessing: false,
        currentProcessingId: null,
        progressState: null
      })

      const appError = handleError(error, entry.file.name)
      get().addError(appError.toJSON())
    }
  },

  cancelProcessing: () => {
    const { currentProcessingId } = get()
    if (currentProcessingId) {
      fontProcessor.cancelProcessing(currentProcessingId)
    }
    set({
      isProcessing: false,
      currentProcessingId: null,
      progressState: null
    })
  },

  // エラー管理
  addError: (error: AppError) => {
    set(state => ({
      errors: [...state.errors, error]
    }))
  },

  removeError: (index: number) => {
    set(state => ({
      errors: state.errors.filter((_, i) => i !== index)
    }))
  },

  clearErrors: () => {
    set({ errors: [] })
  },

  // UI操作
  setSelectedPreset: (preset: string) => {
    set({ selectedPreset: preset })
  },

  setCustomCharacters: (characters: string) => {
    const uniqueChars = getUniqueCharacters(characters)
    set({ customCharacters: uniqueChars })
  },

  setOutputFormat: (format: OutputFormat) => {
    set({ outputFormat: format })
  },

  setDragOverState: (isDragOver: boolean) => {
    set({ isDragOver })
  },

  // バリアブルフォント
  setVariationAxesValues: (values: Record<string, number>) => {
    set({ variationAxesValues: values })
  },

  setPinVariationAxes: (pin: boolean) => {
    set({ pinVariationAxes: pin })
  },

  resetVariationAxesToDefaults: (axes: { tag: string; default: number }[]) => {
    const defaultValues: Record<string, number> = {}
    axes.forEach(axis => {
      defaultValues[axis.tag] = axis.default
    })
    set({ variationAxesValues: defaultValues })
  },

  // セレクタ
  getEffectiveCharacterSet: () => {
    const { selectedPreset, customCharacters } = get()
    if (selectedPreset === 'custom') {
      return customCharacters
    }
    return getCharacterSetFromPreset(selectedPreset)
  },

  getTotalCharacterCount: () => {
    const characterSet = get().getEffectiveCharacterSet()
    return new Set(characterSet).size
  }
}))
