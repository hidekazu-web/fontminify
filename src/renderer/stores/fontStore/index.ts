import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FontStoreState, createInitialState, ProcessingJob } from './state';
import {
  FontStoreActions,
  createFileActions,
  createProcessingActions,
  createErrorActions,
  createUIActions,
} from './actions';
import { FontStoreSelectors, createSelectors } from './selectors';

// 型をre-export
export type { ProcessingJob } from './state';

/**
 * FontStoreの完全な型定義
 */
export type FontStore = FontStoreState & FontStoreActions & FontStoreSelectors;

/**
 * ダークモードを検出
 */
function detectDarkMode(): boolean {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

/**
 * プログレス更新リスナーを初期化
 */
function initializeProgressListener(
  set: (partial: Partial<FontStoreState>) => void
): void {
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.onProgressUpdate((progress) => {
      set({ progressState: progress });
    });

    window.electronAPI.onProcessingCancelled(() => {
      set({
        isProcessing: false,
        progressState: null,
        processingJobs: [],
      });
    });
  }
}

/**
 * システムダークモード変更の監視を初期化
 */
function initializeDarkModeListener(
  set: (partial: Partial<FontStoreState>) => void
): void {
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
}

/**
 * FontMinifyのメインストア
 */
export const useFontStore = create<FontStore>()(
  subscribeWithSelector((set, get) => {
    // リスナーの初期化
    initializeProgressListener(set);
    initializeDarkModeListener(set);

    // 初期状態
    const initialState = createInitialState(detectDarkMode());

    // アクションの作成
    const fileActions = createFileActions(set, get);
    const processingActions = createProcessingActions(set, get);
    const errorActions = createErrorActions(set, get);
    const uiActions = createUIActions(set, get);
    const selectors = createSelectors(get);

    return {
      ...initialState,
      ...fileActions,
      ...processingActions,
      ...errorActions,
      ...uiActions,
      ...selectors,
    };
  })
);

// 後方互換性について:
// - handleAsyncOperation → executeWithErrorHandling に変更（actions.ts）
// - dragOverState → isDragOver に変更（state.ts）
//   後方互換性のため selectors.ts で dragOverState getter を提供
