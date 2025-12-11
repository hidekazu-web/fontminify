import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { initializeSecurity, configureBrowserWindowSecurity } from './security';
import { initializeAutoUpdater } from './autoUpdater';
import { startMemoryMonitoring } from './services/memoryMonitor';
import { registerIPCHandlers } from './ipc/handlers';


const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const preloadPath = join(__dirname, 'preload.js');
  
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      backgroundThrottling: false,
      spellcheck: false,
      preload: preloadPath,
      sandbox: false,
    },
  });

  // セキュリティ設定の適用
  configureBrowserWindowSecurity(mainWindow);

  // エラーハンドリング（開発モード時のみ）
  if (isDev) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Renderer process gone:', details);
    });
  }

  // ウィンドウの表示準備完了後に表示
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    
    mainWindow.show();
    
    // 開発モード時のみ開発者ツールを開く
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // ウィンドウが閉じられた時の処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // コンテンツの読み込み
  if (isDev) {
    mainWindow.loadURL('http://localhost:5175');
  } else {
    // 複数のパスを試行
    const possiblePaths = [
      join(__dirname, '../index.html'),
      join(__dirname, '../../index.html'),
      join(__dirname, '../renderer/index.html'),
      join(process.resourcesPath, 'app', 'index.html'),
      join(process.resourcesPath, 'app.asar', 'index.html')
    ];
    
    let htmlPath = '';
    for (const path of possiblePaths) {
      try {
        if (require('fs').existsSync(path)) {
          htmlPath = path;
          if (isDev) console.log('Found HTML at:', htmlPath);
          break;
        }
      } catch (e) {
        if (isDev) console.log('Path not accessible:', path);
      }
    }
    
    if (htmlPath) {
      if (isDev) console.log('Loading HTML from:', htmlPath);
      mainWindow.loadFile(htmlPath);
    } else {
      if (isDev) {
        console.error('Could not find index.html in any expected location');
        console.log('__dirname:', __dirname);
        console.log('process.resourcesPath:', process.resourcesPath);
      }
    }
  }
}

// アプリケーションの準備完了
app.whenReady().then(() => {
  // セキュリティ設定の初期化
  initializeSecurity();
  
  // IPCハンドラーの登録
  registerIPCHandlers();
  
  // メインウィンドウの作成
  createWindow();
  
  // 自動アップデート機能の初期化
  initializeAutoUpdater();
  
  // メモリ監視開始（開発環境では30秒間隔、本番環境では5分間隔）
  const monitoringInterval = isDev ? 30000 : 300000;
  startMemoryMonitoring(monitoringInterval);
});

// 全てのウィンドウが閉じられた時の処理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリケーションがアクティブになった時の処理
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// セキュリティ: 不正なプロトコルハンドラーを防ぐ
app.setAsDefaultProtocolClient('fontminify');

// セキュリティ: 開発者ツールの制御
// デバッグのため一時的に無効化
/*
if (!isDev) {
  app.on('web-contents-created', (event, contents) => {
    contents.on('devtools-opened', () => {
      console.warn('DevTools opened in production mode');
      contents.closeDevTools();
    });
  });
}
*/

export { mainWindow };