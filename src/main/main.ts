import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { initializeSecurity, configureBrowserWindowSecurity } from './security';
import { initializeAutoUpdater } from './autoUpdater';
import { startMemoryMonitoring } from './services/memoryMonitor';
import { setupIPC } from './ipc/handlers';


const isDev = process.env.NODE_ENV === 'development';

let mainWindow: any = null;

function createWindow(): void {
  const preloadPath = join(__dirname, 'preload.js');
  console.log('Preload script path:', preloadPath);
  console.log('Preload script exists:', require('fs').existsSync(preloadPath));
  
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

  // ウィンドウの表示準備完了後に表示
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    
    mainWindow.show();
    
    // デバッグのため開発者ツールを自動的に開く
    mainWindow.webContents.openDevTools();
  });

  // ウィンドウが閉じられた時の処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // コンテンツの読み込み
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, '../../src/renderer/index.html'));
  }
}

// アプリケーションの準備完了
app.whenReady().then(() => {
  // セキュリティ設定の初期化
  initializeSecurity();
  
  // IPC通信の初期化
  setupIPC();
  
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
  const { BrowserWindow: BW } = require('electron');
  if (BW.getAllWindows().length === 0) {
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