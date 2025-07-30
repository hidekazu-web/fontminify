import { contextBridge, ipcRenderer } from 'electron';
import { validateIPCMessage, logSecurityEvent } from '../shared/security';

/**
 * セキュアなIPC通信のラッパー
 */
const secureIpcInvoke = async (channel: string, ...args: any[]): Promise<any> => {
  // IPCメッセージの検証
  if (!validateIPCMessage(channel, args)) {
    logSecurityEvent('INVALID_IPC_MESSAGE', { channel, args });
    throw new Error(`Invalid IPC message: ${channel}`);
  }

  try {
    const result = await ipcRenderer.invoke(channel, ...args);
    return result;
  } catch (error) {
    logSecurityEvent('IPC_ERROR', { channel, error });
    throw error;
  }
};

/**
 * セキュアなIPC送信のラッパー
 */
const secureIpcSend = (channel: string, ...args: any[]): void => {
  // IPCメッセージの検証
  if (!validateIPCMessage(channel, args)) {
    logSecurityEvent('INVALID_IPC_MESSAGE', { channel, args });
    return;
  }

  ipcRenderer.send(channel, ...args);
};

/**
 * セキュアなAPIの公開
 */
export const exposeSecureApi = (): void => {
  contextBridge.exposeInMainWorld('electronAPI', {
    // フォント関連API
    analyzeFont: (filePath: string) => secureIpcInvoke('font:analyze', filePath),
    subsetFont: (options: any) => secureIpcInvoke('font:subset', options),
    saveFont: (data: any, filePath: string) => secureIpcInvoke('font:save', data, filePath),
    
    // ダイアログAPI
    showSaveDialog: (options: any) => secureIpcInvoke('app:show-save-dialog', options),
    showErrorDialog: (title: string, content: string) => secureIpcInvoke('app:show-error-dialog', title, content),
    
    // アプリケーション情報API
    getVersion: () => secureIpcInvoke('app:get-version'),
    
    // セキュリティ関連API
    logSecurityEvent: (event: string, details?: any) => {
      logSecurityEvent(event, details);
    },
    
    // ファイル検証API
    validateFile: (filename: string, size: number) => {
      const { validateFileExtension, validateFileSize } = require('../shared/security');
      return {
        validExtension: validateFileExtension(filename),
        validSize: validateFileSize(size)
      };
    }
  });

  // セキュリティヘルパーの公開
  contextBridge.exposeInMainWorld('securityAPI', {
    sanitizeFileName: (filename: string) => {
      const { sanitizeFileName } = require('../shared/security');
      return sanitizeFileName(filename);
    },
    
    validateFilePath: (filePath: string) => {
      const { validateFilePath } = require('../shared/security');
      return validateFilePath(filePath);
    },
    
    logEvent: (event: string, details?: any) => {
      logSecurityEvent(event, details);
    }
  });
};

/**
 * セキュリティ監視の初期化
 */
export const initializeSecurityMonitoring = (): void => {
  // ページ読み込み完了の監視
  window.addEventListener('DOMContentLoaded', () => {
    logSecurityEvent('PAGE_LOADED', {
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  });

  // エラーの監視
  window.addEventListener('error', (event) => {
    logSecurityEvent('JAVASCRIPT_ERROR', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });

  // 未処理のPromise拒否の監視
  window.addEventListener('unhandledrejection', (event) => {
    logSecurityEvent('UNHANDLED_PROMISE_REJECTION', {
      reason: event.reason,
      stack: event.reason?.stack
    });
  });

  // セキュリティポリシー違反の監視
  document.addEventListener('securitypolicyviolation', (event) => {
    logSecurityEvent('CSP_VIOLATION', {
      blockedURI: event.blockedURI,
      documentURI: event.documentURI,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      referrer: event.referrer,
      violatedDirective: event.violatedDirective
    });
  });
};