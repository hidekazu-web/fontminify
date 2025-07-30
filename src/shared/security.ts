/**
 * セキュリティ関連の定数と設定
 */

// セキュリティヘッダー設定
export const SECURITY_HEADERS = {
  'Content-Security-Policy': {
    development: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws://localhost:5173; img-src 'self' data: blob: file:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:5173;",
    production: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file:; font-src 'self' data:; connect-src 'self';"
  },
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
} as const;

// 許可されたファイル拡張子
export const ALLOWED_FILE_EXTENSIONS = [
  '.ttf',
  '.otf',
  '.woff',
  '.woff2'
] as const;

// 許可されたMIMEタイプ
export const ALLOWED_MIME_TYPES = [
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-ttf',
  'application/font-otf',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/x-font-woff',
  'application/vnd.ms-fontobject'
] as const;

// セキュリティ関連のエラー
export enum SecurityErrorType {
  INVALID_FILE_EXTENSION = 'INVALID_FILE_EXTENSION',
  INVALID_MIME_TYPE = 'INVALID_MIME_TYPE',
  FILE_SIZE_EXCEEDED = 'FILE_SIZE_EXCEEDED',
  MALICIOUS_FILE_DETECTED = 'MALICIOUS_FILE_DETECTED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS'
}

// ファイルサイズ制限 (100MB)
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * ファイル拡張子の検証
 */
export function validateFileExtension(filename: string): boolean {
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  return extension ? ALLOWED_FILE_EXTENSIONS.includes(extension as any) : false;
}

/**
 * ファイルサイズの検証
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * ファイルパスの検証（パストラバーサル攻撃の防止）
 */
export function validateFilePath(filePath: string): boolean {
  // パストラバーサル攻撃のパターンを検出
  const dangerousPatterns = [
    /\.\./,
    /\//,
    /\\/,
    /:/,
    /\*/,
    /\?/,
    /</,
    />/,
    /\|/
  ];

  return !dangerousPatterns.some(pattern => pattern.test(filePath));
}

/**
 * ファイル名のサニタイズ
 */
export function sanitizeFileName(filename: string): string {
  // 危険な文字を除去またはエスケープ
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\./g, '_')
    .slice(0, 255); // ファイル名の長さ制限
}

/**
 * IPCメッセージの検証
 */
export function validateIPCMessage(channel: string, data: any): boolean {
  // 許可されたIPCチャンネルのリスト
  const allowedChannels = [
    'font:analyze',
    'font:subset',
    'font:save',
    'app:get-version',
    'app:show-save-dialog',
    'app:show-error-dialog'
  ];

  if (!allowedChannels.includes(channel)) {
    console.warn(`不正なIPCチャンネル: ${channel}`);
    return false;
  }

  // データサイズの制限（10MB）
  const dataSize = JSON.stringify(data).length;
  if (dataSize > 10 * 1024 * 1024) {
    console.warn(`IPCメッセージサイズが制限を超過: ${dataSize} bytes`);
    return false;
  }

  return true;
}

/**
 * セキュリティログの記録
 */
export function logSecurityEvent(event: string, details: any = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A'
  };

  console.warn('[SECURITY]', logEntry);
  
  // 本番環境では外部ログサービスに送信することを検討
  if (process.env.NODE_ENV === 'production') {
    // TODO: セキュリティ監視サービスに送信
  }
}