import { dialog } from 'electron';
import { mainWindow } from './main';

// 開発環境では autoUpdater をモック
let autoUpdater: any;
if (process.env.NODE_ENV === 'development') {
  // 開発環境用のモック
  autoUpdater = {
    on: () => {},
    checkForUpdatesAndNotify: () => Promise.resolve(),
    checkForUpdates: () => Promise.resolve(),
    quitAndInstall: () => {},
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    allowDowngrade: false,
    currentVersion: { version: '1.0.0' },
    setFeedURL: () => {},
    logger: { transports: { file: { level: 'info' } } }
  };
} else {
  // プロダクション環境でも一時的にモックを使用
  autoUpdater = {
    on: () => {},
    checkForUpdatesAndNotify: () => Promise.resolve(),
    checkForUpdates: () => Promise.resolve(),
    quitAndInstall: () => {},
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    allowDowngrade: false,
    currentVersion: { version: '1.0.0' },
    setFeedURL: () => {},
    logger: { transports: { file: { level: 'info' } } }
  };
}

/**
 * 自動アップデート機能の初期化
 */
export function initializeAutoUpdater(): void {
  // 開発環境では自動アップデートを無効化
  if (process.env.NODE_ENV === 'development') {
    console.log('開発環境のため自動アップデートを無効化しました');
    return;
  }

  // アップデートが利用可能な場合
  autoUpdater.on('update-available', (updateInfo) => {
    console.log('アップデートが利用可能です:', updateInfo.version);
    
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'アップデート利用可能',
        message: `FontMinify ${updateInfo.version} が利用可能です`,
        detail: 'バックグラウンドでダウンロードを開始します。完了後に通知されます。',
        buttons: ['OK']
      });
    }
  });

  // アップデートが利用不可能な場合
  autoUpdater.on('update-not-available', (updateInfo) => {
    console.log('最新バージョンを使用中です:', updateInfo.version);
  });

  // ダウンロード進捗
  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `ダウンロード進捗: ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`;
    console.log(logMessage);
    
    // レンダラープロセスに進捗を送信
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  // ダウンロード完了
  autoUpdater.on('update-downloaded', (updateInfo) => {
    console.log('アップデートのダウンロードが完了しました:', updateInfo.version);
    
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'アップデート準備完了',
        message: `FontMinify ${updateInfo.version} のダウンロードが完了しました`,
        detail: 'アプリケーションを再起動してアップデートを適用しますか？',
        buttons: ['今すぐ再起動', '後で'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // アプリケーションを終了してアップデートをインストール
          autoUpdater.quitAndInstall();
        }
      });
    }
  });

  // エラーハンドリング
  autoUpdater.on('error', (error) => {
    console.error('自動アップデートエラー:', error);
    
    if (mainWindow) {
      dialog.showErrorBox(
        'アップデートエラー',
        `アップデート中にエラーが発生しました: ${error.message}`
      );
    }
  });

  // アップデートチェックを開始
  checkForUpdates();
}

/**
 * アップデートチェックを実行
 */
export function checkForUpdates(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('開発環境のためアップデートチェックをスキップしました');
    return;
  }

  console.log('アップデートをチェック中...');
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('アップデートチェックに失敗:', error);
  });
}

/**
 * 手動でアップデートを確認
 */
export function manualUpdateCheck(): void {
  if (process.env.NODE_ENV === 'development') {
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '開発環境',
        message: '開発環境では自動アップデート機能は利用できません',
        buttons: ['OK']
      });
    }
    return;
  }

  console.log('手動アップデートチェックを開始...');
  
  autoUpdater.checkForUpdates()
    .then((result) => {
      if (!result || !result.updateInfo) {
        if (mainWindow) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '最新バージョン',
            message: '現在のバージョンが最新です',
            detail: 'アップデートは必要ありません。',
            buttons: ['OK']
          });
        }
      }
    })
    .catch((error) => {
      console.error('手動アップデートチェックに失敗:', error);
      
      if (mainWindow) {
        dialog.showErrorBox(
          'アップデートチェックエラー',
          `アップデートの確認中にエラーが発生しました: ${error.message}`
        );
      }
    });
}

/**
 * アップデート設定の取得
 */
export function getUpdateSettings() {
  return {
    autoDownload: autoUpdater.autoDownload,
    autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
    allowPrerelease: autoUpdater.allowPrerelease,
    allowDowngrade: autoUpdater.allowDowngrade
  };
}

/**
 * アップデート設定の更新
 */
export function updateSettings(settings: {
  autoDownload?: boolean;
  autoInstallOnAppQuit?: boolean;
  allowPrerelease?: boolean;
  allowDowngrade?: boolean;
}) {
  if (settings.autoDownload !== undefined) {
    autoUpdater.autoDownload = settings.autoDownload;
  }
  
  if (settings.autoInstallOnAppQuit !== undefined) {
    autoUpdater.autoInstallOnAppQuit = settings.autoInstallOnAppQuit;
  }
  
  if (settings.allowPrerelease !== undefined) {
    autoUpdater.allowPrerelease = settings.allowPrerelease;
  }
  
  if (settings.allowDowngrade !== undefined) {
    autoUpdater.allowDowngrade = settings.allowDowngrade;
  }
  
  console.log('アップデート設定を更新しました:', settings);
}

/**
 * 現在のバージョン情報を取得
 */
export function getCurrentVersion(): string {
  return autoUpdater.currentVersion?.version || require('../../package.json').version;
}

/**
 * アップデートサーバーのURLを設定
 */
export function setFeedURL(url: string): void {
  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'your-username',
      repo: 'fontminify',
      private: false
    });
    console.log('アップデートサーバーのURLを設定しました:', url);
  } catch (error) {
    console.error('アップデートサーバーURLの設定に失敗:', error);
  }
}