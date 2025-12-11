import { session, BrowserWindow } from 'electron';

const isDev = process.env.NODE_ENV === 'development';

// セキュリティヘッダー定義
const SECURITY_HEADERS = {
  'Content-Security-Policy': isDev
    ? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:*; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:* ws://localhost:*;"
    : "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/**
 * セキュリティヘッダーの設定
 */
export function configureSecurityHeaders(): void {
  
  const filter = {
    urls: ['*://*/*']
  };

  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [SECURITY_HEADERS['Content-Security-Policy']],
        'X-Content-Type-Options': [SECURITY_HEADERS['X-Content-Type-Options']],
        'X-Frame-Options': [SECURITY_HEADERS['X-Frame-Options']],
        'X-XSS-Protection': [SECURITY_HEADERS['X-XSS-Protection']],
        'Referrer-Policy': [SECURITY_HEADERS['Referrer-Policy']]
      }
    });
  });
}

/**
 * セッションのセキュリティ設定
 */
export function configureSessionSecurity(): void {
  // パーミッション要求の制限
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'clipboard-read'];
    const isAllowed = allowedPermissions.includes(permission);
    
    if (!isAllowed) {
      console.warn(`拒否されたパーミッション要求: ${permission}`);
    }
    
    callback(isAllowed);
  });

  // 証明書エラーの処理
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    // 開発環境では自己署名証明書を許可
    if (process.env.NODE_ENV === 'development' && request.hostname === 'localhost') {
      callback(0); // 許可
    } else {
      callback(-2); // 拒否
    }
  });

  // ダウンロードの制限
  session.defaultSession.on('will-download', (event, item, webContents) => {
    // フォントファイル以外のダウンロードを禁止
    const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const filename = item.getFilename().toLowerCase();
    const hasAllowedExtension = allowedExtensions.some(ext => filename.endsWith(ext));
    
    if (!hasAllowedExtension) {
      console.warn(`禁止されたファイルのダウンロード試行: ${filename}`);
      event.preventDefault();
    }
  });
}

/**
 * BrowserWindowのセキュリティ設定
 */
export function configureBrowserWindowSecurity(window: BrowserWindow): void {
  const isDev = process.env.NODE_ENV === 'development';

  // 新しいウィンドウの作成を制限
  window.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`新しいウィンドウの作成がブロックされました: ${url}`);
    return { action: 'deny' };
  });

  // ナビゲーションの制限
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const allowedHosts = isDev ? ['localhost'] : [];
    
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      console.warn(`ナビゲーションがブロックされました: ${navigationUrl}`);
      event.preventDefault();
    }
  });

  // 外部リンクの制限
  window.webContents.on('will-redirect', (event, navigationUrl) => {
    console.warn(`リダイレクトがブロックされました: ${navigationUrl}`);
    event.preventDefault();
  });

  // DevToolsの制御
  if (!isDev) {
    window.webContents.on('before-input-event', (event, input) => {
      // 本番環境では DevTools のショートカットを無効化
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        event.preventDefault();
      }
      if (input.key === 'F12') {
        event.preventDefault();
      }
    });
  }

  // コンソールメッセージの監視
  window.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) { // warning以上のレベル
      console.warn(`Renderer Console [${level}]:`, message, `at ${sourceId}:${line}`);
    }
  });

  // 証明書エラーの処理
  window.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    if (isDev && url.startsWith('https://localhost')) {
      // 開発環境のlocalhostは許可
      event.preventDefault();
      callback(true);
    } else {
      console.error(`証明書エラー: ${error} for ${url}`);
      callback(false);
    }
  });
}

/**
 * ファイルプロトコルのセキュリティ設定
 */
export function configureFileProtocolSecurity(): void {
  const path = require('path');
  
  session.defaultSession.protocol.interceptFileProtocol('file', (request, callback) => {
    const url = request.url.substr(7); // 'file://' を削除
    const normalizedPath = path.normalize(url);
    
    // アプリケーションディレクトリ外へのアクセスを制限
    const appPath = process.resourcesPath || __dirname;
    const isAllowedPath = normalizedPath.startsWith(appPath) || 
                         normalizedPath.startsWith(path.join(appPath, '..', 'dist'));
    
    if (!isAllowedPath) {
      console.warn(`不正なファイルアクセスがブロックされました: ${normalizedPath}`);
      callback({ error: -3 }); // ERR_ABORTED
      return;
    }
    
    callback({ path: normalizedPath });
  });
}

/**
 * セキュリティ設定の初期化
 */
export function initializeSecurity(): void {
  console.log('セキュリティ設定を初期化中...');
  
  configureSecurityHeaders();
  configureSessionSecurity();
  configureFileProtocolSecurity();
  
  console.log('セキュリティ設定が完了しました');
}