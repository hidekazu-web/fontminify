import { getCharacterSetFromPreset } from '../../../shared/presets';
import { FontStoreState } from './state';

/**
 * FontStoreのセレクタ（computed）型定義
 */
export interface FontStoreSelectors {
  getEffectiveCharacterSet: () => string;
  getTotalCharacterCount: () => number;
  getProcessingProgress: () => number;
  /** @deprecated isDragOver を使用してください */
  dragOverState: boolean;
}

type GetState = () => FontStoreState;

/**
 * セレクタを作成
 */
export function createSelectors(get: GetState): FontStoreSelectors {
  return {
    /**
     * 有効な文字セットを取得
     * カスタム選択の場合はカスタム文字を、プリセット選択の場合はプリセットの文字セットを返す
     */
    getEffectiveCharacterSet: () => {
      const state = get();
      if (state.selectedPreset === 'custom') {
        return state.customCharacters;
      }
      return getCharacterSetFromPreset(state.selectedPreset);
    },

    /**
     * 重複を除いた総文字数を取得
     */
    getTotalCharacterCount: () => {
      const { selectedPreset, customCharacters } = get();
      const characterSet = selectedPreset === 'custom'
        ? customCharacters
        : getCharacterSetFromPreset(selectedPreset);
      return new Set(characterSet).size;
    },

    /**
     * 処理進捗率を取得（0-100）
     */
    getProcessingProgress: () => {
      const jobs = get().processingJobs;
      if (jobs.length === 0) return 0;

      const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
      return Math.round(totalProgress / jobs.length);
    },

    /**
     * @deprecated isDragOver を直接使用してください
     * 後方互換性のためのエイリアス
     */
    get dragOverState() {
      return get().isDragOver;
    },
  };
}
