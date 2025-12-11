import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FontAnalysis, SubsetOptions, ProgressState } from '../../shared/types';
import { getCharacterSetFromPreset, getUniqueCharacters } from '../../shared/presets';
import { AppError, handleError } from '../../shared/errors';

interface ProcessingJob {
  id: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  outputPath?: string;
  originalSize?: number;
  compressedSize?: number;
}

interface FontStore {
  // State
  selectedFiles: string[];
  fontAnalyses: Record<string, FontAnalysis>;
  subsetOptions: SubsetOptions;
  isProcessing: boolean;
  progressState: ProgressState | null;
  processingJobs: ProcessingJob[];
  
  // Error State
  errors: AppError[];
  hasErrors: boolean;
  
  // UI State
  selectedPreset: string;
  customCharacters: string;
  showAdvancedOptions: boolean;
  dragOverState: boolean;
  isDarkMode: boolean;

  // Actions
  addFiles: (filePaths: string[]) => void;
  removeFile: (filePath: string) => void;
  clearFiles: () => void;
  setFontAnalysis: (filePath: string, analysis: FontAnalysis) => void;
  updateSubsetOptions: (options: Partial<SubsetOptions>) => void;
  setProcessing: (processing: boolean) => void;
  setProgressState: (state: ProgressState | null) => void;
  cancelProcessing: () => void;
  
  // Processing Jobs
  addProcessingJob: (job: ProcessingJob) => void;
  updateProcessingJob: (id: string, updates: Partial<ProcessingJob>) => void;
  removeProcessingJob: (id: string) => void;
  clearProcessingJobs: () => void;
  
  // Error Actions
  addError: (error: unknown, filePath?: string) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
  handleAsyncOperation: <T>(operation: () => Promise<T>, filePath?: string) => Promise<T | null>;
  
  // UI Actions
  setSelectedPreset: (preset: string) => void;
  setCustomCharacters: (characters: string) => void;
  setShowAdvancedOptions: (show: boolean) => void;
  setDragOverState: (dragOver: boolean) => void;
  setDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;
  
  // Computed
  getEffectiveCharacterSet: () => string;
  getTotalCharacterCount: () => number;
  getProcessingProgress: () => number;
}

export const useFontStore = create<FontStore>()(
  subscribeWithSelector((set, get) => {
    // プログレス更新リスナーの初期化
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onProgressUpdate((progress) => {
        set({ progressState: progress });
      });
      
      window.electronAPI.onProcessingCancelled(() => {
        set({
          isProcessing: false,
          progressState: null,
          processingJobs: []
        });
      });
    }
    
    // ダークモード検出の初期化
    const detectDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark;
      }
      return false;
    };
    
    // システムダークモード変更の監視
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent) => {
        set({ isDarkMode: e.matches });
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handleThemeChange);
      
      // 初期設定
      if (detectDarkMode()) {
        document.documentElement.classList.add('dark');
      }
    }
    
    return {
    // Initial state
    selectedFiles: [],
    fontAnalyses: {},
    subsetOptions: {
      inputPath: '',
      outputPath: '',
      preset: 'minimum',
      outputFormat: 'woff2',
      enableWoff2Compression: true,
      compressionLevel: 6,
      removeHinting: false,
      desubroutinize: false,
    },
    isProcessing: false,
    progressState: null,
    processingJobs: [],
    
    // Error State
    errors: [],
    hasErrors: false,
    
    // UI State
    selectedPreset: 'minimum',
    customCharacters: '',
    showAdvancedOptions: false,
    dragOverState: false,
    isDarkMode: detectDarkMode(),

    // Actions
    addFiles: async (filePaths: string[]) => {      
      const newFiles = filePaths.filter(path => !get().selectedFiles.includes(path));
      
      set(state => ({
        selectedFiles: [...state.selectedFiles, ...newFiles]
      }));

      // フォント解析を開始
      for (const filePath of newFiles) {
        try {
          let analysis: FontAnalysis | null = null;

          // ElectronAPIが利用可能な場合
          if (window.electronAPI && window.electronAPI.analyzeFont) {
            analysis = await get().handleAsyncOperation(
              () => window.electronAPI.analyzeFont(filePath),
              filePath
            );
          }

          if (!analysis) {
            // Web版：基本的なフォント情報を生成
            const fileName = filePath.split('/').pop() || filePath;
            const ext = filePath.split('.').pop()?.toLowerCase() || '';
            const format = (['ttf', 'otf', 'woff', 'woff2', 'ttc'].includes(ext) ? ext : 'ttf') as 'ttf' | 'otf' | 'woff' | 'woff2' | 'ttc';
            analysis = {
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

          get().setFontAnalysis(filePath, analysis);
        } catch (error) {
          console.error('Font analysis error:', error);
          // Web版では非致命的エラーとして処理
          const fileName = filePath.split('/').pop() || filePath;
          const ext = filePath.split('.').pop()?.toLowerCase() || '';
          const format = (['ttf', 'otf', 'woff', 'woff2', 'ttc'].includes(ext) ? ext : 'ttf') as 'ttf' | 'otf' | 'woff' | 'woff2' | 'ttc';
          const webAnalysis: FontAnalysis = {
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
        processingJobs: state.processingJobs.filter(job => job.filePath !== filePath)
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
          [filePath]: analysis
        }
      }));
    },

    updateSubsetOptions: (options: Partial<SubsetOptions>) => {
      set(state => ({
        subsetOptions: {
          ...state.subsetOptions,
          ...options
        }
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
          processingJobs: []
        });
      } catch (error) {
        get().addError(error);
      }
    },
    
    // Processing Jobs
    addProcessingJob: (job: ProcessingJob) => {
      set(state => ({
        processingJobs: [...state.processingJobs, job]
      }));
    },

    updateProcessingJob: (id: string, updates: Partial<ProcessingJob>) => {
      set(state => ({
        processingJobs: state.processingJobs.map(job =>
          job.id === id ? { ...job, ...updates } : job
        )
      }));
    },

    removeProcessingJob: (id: string) => {
      set(state => ({
        processingJobs: state.processingJobs.filter(job => job.id !== id)
      }));
    },

    clearProcessingJobs: () => {
      set({ processingJobs: [] });
    },
    
    // Error Actions
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

    handleAsyncOperation: async <T>(
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
    
    // UI Actions
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
          preset: undefined 
        });
      }
    },

    setShowAdvancedOptions: (show: boolean) => {
      set({ showAdvancedOptions: show });
    },

    setDragOverState: (dragOver: boolean) => {
      set({ dragOverState: dragOver });
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
    
    // Computed
    getEffectiveCharacterSet: () => {
      const state = get();
      if (state.selectedPreset === 'custom') {
        return state.customCharacters;
      }
      return getCharacterSetFromPreset(state.selectedPreset);
    },

    getTotalCharacterCount: () => {
      const characterSet = get().getEffectiveCharacterSet();
      return new Set(characterSet).size;
    },

    getProcessingProgress: () => {
      const jobs = get().processingJobs;
      if (jobs.length === 0) return 0;
      
      const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
      return Math.round(totalProgress / jobs.length);
    },
  };})
);