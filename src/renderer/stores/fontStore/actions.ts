import { FontAnalysis, SubsetOptions, ProgressState } from '../../../shared/types';
import { AppError, handleError } from '../../../shared/errors';
import { getCharacterSetFromPreset, getUniqueCharacters } from '../../../shared/presets';
import { ProcessingJob, FontStoreState } from './state';

/**
 * FontStoreのアクション型定義
 */
export interface FontStoreActions {
  // ファイル操作
  addFiles: (filePaths: string[]) => void;
  removeFile: (filePath: string) => void;
  clearFiles: () => void;
  setFontAnalysis: (filePath: string, analysis: FontAnalysis) => void;

  // オプション更新
  updateSubsetOptions: (options: Partial<SubsetOptions>) => void;

  // 処理制御
  setProcessing: (processing: boolean) => void;
  setProgressState: (state: ProgressState | null) => void;
  cancelProcessing: () => void;

  // 処理ジョブ管理
  addProcessingJob: (job: ProcessingJob) => void;
  updateProcessingJob: (id: string, updates: Partial<ProcessingJob>) => void;
  removeProcessingJob: (id: string) => void;
  clearProcessingJobs: () => void;

  // エラー管理
  addError: (error: unknown, filePath?: string) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
  executeWithErrorHandling: <T>(operation: () => Promise<T>, filePath?: string) => Promise<T | null>;

  // UI操作
  setSelectedPreset: (preset: string) => void;
  setCustomCharacters: (characters: string) => void;
  setShowAdvancedOptions: (show: boolean) => void;
  setDragOverState: (dragOver: boolean) => void;
  setDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;

  // バリアブルフォント操作
  setVariationAxesValues: (values: Record<string, number>) => void;
  setPinVariationAxes: (pin: boolean) => void;
  resetVariationAxesToDefaults: (axes: { tag: string; default: number }[]) => void;
}

type SetState = (partial: Partial<FontStoreState> | ((state: FontStoreState) => Partial<FontStoreState>)) => void;
type GetState = () => FontStoreState & FontStoreActions;

/**
 * ファイル操作アクションを作成
 */
export function createFileActions(set: SetState, get: GetState): Pick<FontStoreActions, 'addFiles' | 'removeFile' | 'clearFiles' | 'setFontAnalysis'> {
  return {
    addFiles: async (filePaths: string[]) => {
      const newFiles = filePaths.filter(path => !get().selectedFiles.includes(path));

      set(state => ({
        selectedFiles: [...state.selectedFiles, ...newFiles],
      }));

      // フォント解析を開始
      for (const filePath of newFiles) {
        console.log('Analyzing font:', filePath);
        try {
          let analysis: FontAnalysis;

          // ElectronAPIが利用可能な場合
          if (window.electronAPI && window.electronAPI.analyzeFont) {
            analysis = await get().executeWithErrorHandling(
              () => window.electronAPI.analyzeFont(filePath),
              filePath
            );
          } else {
            // Web版：基本的なフォント情報を生成
            analysis = createWebFallbackAnalysis(filePath);
          }

          if (analysis) {
            console.log('Analysis successful:', analysis);
            get().setFontAnalysis(filePath, analysis);
          }
        } catch (error) {
          console.error('Font analysis error:', error);
          // Web版では非致命的エラーとして処理
          const webAnalysis = createWebFallbackAnalysis(filePath);
          get().setFontAnalysis(filePath, webAnalysis);
        }
      }
    },

    removeFile: (filePath: string) => {
      set(state => ({
        selectedFiles: state.selectedFiles.filter(f => f !== filePath),
        fontAnalyses: Object.fromEntries(
          Object.entries(state.fontAnalyses).filter(([key]) => key !== filePath)
        ),
        processingJobs: state.processingJobs.filter(job => job.filePath !== filePath),
      }));
    },

    clearFiles: () => {
      set({
        selectedFiles: [],
        fontAnalyses: {},
        processingJobs: [],
        isProcessing: false,
        progressState: null,
      });
    },

    setFontAnalysis: (filePath: string, analysis: FontAnalysis) => {
      set(state => ({
        fontAnalyses: {
          ...state.fontAnalyses,
          [filePath]: analysis,
        },
      }));
    },
  };
}

/**
 * 処理制御アクションを作成
 */
export function createProcessingActions(set: SetState, get: GetState): Pick<FontStoreActions, 'updateSubsetOptions' | 'setProcessing' | 'setProgressState' | 'cancelProcessing' | 'addProcessingJob' | 'updateProcessingJob' | 'removeProcessingJob' | 'clearProcessingJobs'> {
  return {
    updateSubsetOptions: (options: Partial<SubsetOptions>) => {
      set(state => ({
        subsetOptions: {
          ...state.subsetOptions,
          ...options,
        },
      }));
    },

    setProcessing: (processing: boolean) => {
      set({ isProcessing: processing });
    },

    setProgressState: (state: ProgressState | null) => {
      set({ progressState: state });
    },

    cancelProcessing: async () => {
      try {
        await window.electronAPI?.cancelProcessing?.();
        set({
          isProcessing: false,
          progressState: null,
          processingJobs: [],
        });
      } catch (error) {
        get().addError(error);
      }
    },

    addProcessingJob: (job: ProcessingJob) => {
      set(state => ({
        processingJobs: [...state.processingJobs, job],
      }));
    },

    updateProcessingJob: (id: string, updates: Partial<ProcessingJob>) => {
      set(state => ({
        processingJobs: state.processingJobs.map(job =>
          job.id === id ? { ...job, ...updates } : job
        ),
      }));
    },

    removeProcessingJob: (id: string) => {
      set(state => ({
        processingJobs: state.processingJobs.filter(job => job.id !== id),
      }));
    },

    clearProcessingJobs: () => {
      set({ processingJobs: [] });
    },
  };
}

/**
 * エラー管理アクションを作成
 */
export function createErrorActions(set: SetState, get: GetState): Pick<FontStoreActions, 'addError' | 'removeError' | 'clearErrors' | 'executeWithErrorHandling'> {
  return {
    addError: (error: unknown, filePath?: string) => {
      const fontMinifyError = handleError(error, filePath);
      const appError = fontMinifyError.toJSON();

      set(state => ({
        errors: [...state.errors, appError],
        hasErrors: true,
      }));

      console.error('FontMinify Error:', fontMinifyError);
    },

    removeError: (index: number) => {
      set(state => {
        const newErrors = state.errors.filter((_, i) => i !== index);
        return {
          errors: newErrors,
          hasErrors: newErrors.length > 0,
        };
      });
    },

    clearErrors: () => {
      set({
        errors: [],
        hasErrors: false,
      });
    },

    executeWithErrorHandling: async <T>(
      operation: () => Promise<T>,
      filePath?: string
    ): Promise<T | null> => {
      try {
        return await operation();
      } catch (error) {
        get().addError(error, filePath);
        return null;
      }
    },
  };
}

/**
 * UI操作アクションを作成
 */
export function createUIActions(set: SetState, get: GetState): Pick<FontStoreActions, 'setSelectedPreset' | 'setCustomCharacters' | 'setShowAdvancedOptions' | 'setDragOverState' | 'setDarkMode' | 'toggleDarkMode' | 'setVariationAxesValues' | 'setPinVariationAxes' | 'resetVariationAxesToDefaults'> {
  return {
    setSelectedPreset: (preset: string) => {
      set({ selectedPreset: preset });

      // プリセットが変更されたらサブセットオプションを更新
      if (preset !== 'custom') {
        get().updateSubsetOptions({ preset });
      }
    },

    setCustomCharacters: (characters: string) => {
      const uniqueChars = getUniqueCharacters(characters);
      set({ customCharacters: uniqueChars });

      if (get().selectedPreset === 'custom') {
        get().updateSubsetOptions({
          customCharacters: uniqueChars,
          preset: undefined,
        });
      }
    },

    setShowAdvancedOptions: (show: boolean) => {
      set({ showAdvancedOptions: show });
    },

    setDragOverState: (isDragOver: boolean) => {
      set({ isDragOver });
    },

    setDarkMode: (isDark: boolean) => {
      set({ isDarkMode: isDark });
      if (typeof window !== 'undefined') {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },

    toggleDarkMode: () => {
      const currentMode = get().isDarkMode;
      get().setDarkMode(!currentMode);
    },

    setVariationAxesValues: (values: Record<string, number>) => {
      set({ variationAxesValues: values });
      // サブセットオプションにも反映
      if (get().pinVariationAxes) {
        get().updateSubsetOptions({ variationAxes: values });
      }
    },

    setPinVariationAxes: (pin: boolean) => {
      set({ pinVariationAxes: pin });
      // サブセットオプションにも反映
      get().updateSubsetOptions({
        pinVariationAxes: pin,
        variationAxes: pin ? get().variationAxesValues : undefined,
      });
    },

    resetVariationAxesToDefaults: (axes: { tag: string; default: number }[]) => {
      const defaultValues: Record<string, number> = {};
      axes.forEach((axis) => {
        defaultValues[axis.tag] = axis.default;
      });
      set({ variationAxesValues: defaultValues });
      // pinVariationAxesとvariationAxesの両方をsubsetOptionsに設定
      const pin = get().pinVariationAxes;
      get().updateSubsetOptions({
        pinVariationAxes: pin,
        variationAxes: pin ? defaultValues : undefined,
      });
    },
  };
}

/**
 * Web版用のフォールバック解析結果を作成
 * FontAnalysis型に準拠したダミーデータを生成
 */
function createWebFallbackAnalysis(filePath: string): FontAnalysis {
  const fileName = filePath.split('/').pop() || filePath;
  const extension = filePath.split('.').pop()?.toLowerCase() || 'ttf';
  const format = (['ttf', 'otf', 'woff', 'woff2', 'ttc'].includes(extension) ? extension : 'ttf') as FontAnalysis['format'];

  return {
    fileName,
    fileSize: 0,
    format,
    fontFamily: fileName.replace(/\.[^/.]+$/, '') || 'Unknown Font',
    fontSubfamily: 'Regular',
    version: '1.0',
    glyphCount: 0,
    characterRanges: [],
    features: [],
    languages: ['ja', 'en'],
    hasColorEmoji: false,
    isVariableFont: false,
  };
}
