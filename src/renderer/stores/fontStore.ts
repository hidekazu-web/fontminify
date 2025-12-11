/**
 * FontStore - メインストアのエントリーポイント
 *
 * 実装は fontStore/ ディレクトリに分割されています:
 * - state.ts: 状態の型定義と初期状態
 * - actions.ts: アクションの実装
 * - selectors.ts: 計算プロパティ（computed/selectors）
 * - index.ts: 統合エクスポート
 */

// 後方互換性のため、全てをre-export
export { useFontStore } from './fontStore/index';
export type { FontStore, ProcessingJob } from './fontStore/index';
