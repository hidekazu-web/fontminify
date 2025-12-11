/**
 * 共通ユーティリティ関数
 */

/**
 * バイト数を人間が読みやすい形式にフォーマット
 * @param bytes バイト数
 * @returns フォーマットされたサイズ文字列（例: "1.5 MB"）
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 処理フェーズのラベルを取得
 * @param phase 処理フェーズ
 * @returns 日本語ラベル
 */
export function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'idle':
      return '待機中';
    case 'analyzing':
      return 'フォント解析中';
    case 'subsetting':
      return 'サブセット化中';
    case 'optimizing':
      return '最適化中';
    case 'compressing':
      return 'WOFF2圧縮中';
    case 'complete':
      return '完了';
    default:
      return '処理中';
  }
}

/**
 * 秒数を人間が読みやすい形式にフォーマット
 * @param seconds 秒数
 * @returns フォーマットされた時間文字列（例: "1分30秒"）
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}分${remainingSeconds}秒`;
}
