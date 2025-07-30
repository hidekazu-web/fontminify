import { Menu, shell, app, BrowserWindow } from 'electron';

export function createApplicationMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'FontMinify',
      submenu: [
        {
          label: 'FontMinifyについて',
          role: 'about',
        },
        { type: 'separator' },
        {
          label: 'サービス',
          role: 'services',
          submenu: [],
        },
        { type: 'separator' },
        {
          label: 'FontMinifyを隠す',
          accelerator: 'Command+H',
          role: 'hide',
        },
        {
          label: 'その他を隠す',
          accelerator: 'Command+Option+H',
          role: 'hideOthers',
        },
        {
          label: 'すべてを表示',
          role: 'unhide',
        },
        { type: 'separator' },
        {
          label: 'FontMinifyを終了',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'ファイル',
      submenu: [
        {
          label: 'フォントファイルを開く...',
          accelerator: 'Command+O',
          click: async () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send('menu-open-files');
            }
          },
        },
        { type: 'separator' },
        {
          label: '保存...',
          accelerator: 'Command+S',
          click: async () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send('menu-save');
            }
          },
        },
      ],
    },
    {
      label: '編集',
      submenu: [
        { label: '元に戻す', accelerator: 'Command+Z', role: 'undo' },
        { label: 'やり直し', accelerator: 'Shift+Command+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'カット', accelerator: 'Command+X', role: 'cut' },
        { label: 'コピー', accelerator: 'Command+C', role: 'copy' },
        { label: 'ペースト', accelerator: 'Command+V', role: 'paste' },
        { label: 'すべて選択', accelerator: 'Command+A', role: 'selectAll' },
      ],
    },
    {
      label: '表示',
      submenu: [
        { label: 'リロード', accelerator: 'Command+R', role: 'reload' },
        { label: '強制リロード', accelerator: 'Command+Shift+R', role: 'forceReload' },
        { label: '開発者ツール', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '実際のサイズ', accelerator: 'Command+0', role: 'resetZoom' },
        { label: '拡大', accelerator: 'Command+Plus', role: 'zoomIn' },
        { label: '縮小', accelerator: 'Command+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'フルスクリーン切替', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'ウィンドウ',
      submenu: [
        { label: '最小化', accelerator: 'Command+M', role: 'minimize' },
        { label: '閉じる', accelerator: 'Command+W', role: 'close' },
        { type: 'separator' },
        { label: 'すべてを手前に移動', role: 'front' },
      ],
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'FontMinifyについて',
          click: async () => {
            await shell.openExternal('https://github.com/fontminify/fontminify');
          },
        },
        {
          label: 'ドキュメント',
          click: async () => {
            await shell.openExternal('https://github.com/fontminify/fontminify/wiki');
          },
        },
        { type: 'separator' },
        {
          label: 'バグを報告',
          click: async () => {
            await shell.openExternal('https://github.com/fontminify/fontminify/issues');
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}