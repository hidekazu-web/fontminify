import { ipcMain } from 'electron';
import { IPCChannel } from '../../shared/constants';
import { 
  checkForUpdates, 
  manualUpdateCheck, 
  getUpdateSettings, 
  updateSettings, 
  getCurrentVersion 
} from '../autoUpdater';

/**
 * アップデート関連のIPCハンドラーを初期化
 */
export function initializeUpdateHandlers(): void {
  // 手動アップデートチェック
  ipcMain.handle(IPCChannel.CHECK_FOR_UPDATES, async () => {
    try {
      manualUpdateCheck();
      return { success: true };
    } catch (error) {
      console.error('手動アップデートチェックエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  });

  // 現在のバージョン取得
  ipcMain.handle(IPCChannel.GET_APP_VERSION, async () => {
    try {
      const version = getCurrentVersion();
      return { success: true, version };
    } catch (error) {
      console.error('バージョン取得エラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  });

  // アップデート設定取得
  ipcMain.handle(IPCChannel.GET_UPDATE_SETTINGS, async () => {
    try {
      const settings = getUpdateSettings();
      return { success: true, settings };
    } catch (error) {
      console.error('アップデート設定取得エラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  });

  // アップデート設定更新
  ipcMain.handle(IPCChannel.UPDATE_SETTINGS, async (event, newSettings) => {
    try {
      updateSettings(newSettings);
      return { success: true };
    } catch (error) {
      console.error('アップデート設定更新エラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  });

  console.log('アップデート関連IPCハンドラーを初期化しました');
}