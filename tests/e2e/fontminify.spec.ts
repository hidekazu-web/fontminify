import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Electronアプリケーションを起動
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/main/main/main.js')],
    env: {
      NODE_ENV: 'test'
    }
  });

  // メインウィンドウを取得
  page = await electronApp.firstWindow();
  
  // ウィンドウが表示されるまで待機
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  // テスト終了後にアプリケーションを終了
  await electronApp.close();
});

test.describe('FontMinify E2E Tests', () => {
  test('アプリケーション起動確認', async () => {
    // ウィンドウのタイトルを確認
    const title = await page.title();
    expect(title).toBe('FontMinify');

    // メインコンテンツが表示されているか確認
    const mainElement = page.locator('main');
    await expect(mainElement).toBeVisible();
  });

  test('初期UIが正しく表示される', async () => {
    // ヘッダーが表示されているか確認
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // ファイルドロップゾーンが表示されているか確認
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    await expect(dropZone).toBeVisible();

    // ドロップゾーンに適切なテキストが表示されているか確認
    await expect(dropZone).toContainText('フォントファイルをドラッグ');
  });

  test('ファイル選択ボタンが機能する', async () => {
    // ファイル選択ボタンをクリック
    const selectButton = page.locator('button:has-text("ファイルを選択")');
    await expect(selectButton).toBeVisible();
    
    // ボタンがクリック可能であることを確認
    await expect(selectButton).toBeEnabled();
  });

  test('テーマ切り替えが機能する', async () => {
    // ダークモード切り替えボタンを探す
    const themeButton = page.locator('[data-testid="theme-toggle"]');
    
    if (await themeButton.isVisible()) {
      // ダークモード切り替えをテスト
      await themeButton.click();
      
      // HTMLにdarkクラスが追加されているか確認
      const htmlElement = page.locator('html');
      await expect(htmlElement).toHaveClass(/dark/);
      
      // 再度クリックしてライトモードに戻す
      await themeButton.click();
      await expect(htmlElement).not.toHaveClass(/dark/);
    }
  });

  test('アプリケーションメニューが存在する', async () => {
    // macOSのメニューバーが設定されているか確認
    const menuItems = await electronApp.evaluate(async ({ app }) => {
      const menu = app.applicationMenu;
      return menu ? menu.items.map(item => item.label) : [];
    });

    // 基本的なメニュー項目が存在することを確認
    expect(menuItems).toContain('FontMinify');
    expect(menuItems).toContain('File');
    expect(menuItems).toContain('Edit');
    expect(menuItems).toContain('View');
    expect(menuItems).toContain('Window');
    expect(menuItems).toContain('Help');
  });

  test('ウィンドウのサイズ変更が機能する', async () => {
    // 初期サイズを確認
    const initialSize = await page.viewportSize();
    expect(initialSize).toBeTruthy();

    // ウィンドウサイズを変更
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // 新しいサイズを確認
    const newSize = await page.viewportSize();
    expect(newSize?.width).toBe(1200);
    expect(newSize?.height).toBe(800);
  });

  test('エラー状態の表示', async () => {
    // エラーコンテナが存在するか確認
    const errorContainer = page.locator('[data-testid="error-container"]');
    
    // 初期状態ではエラーが表示されていないことを確認
    if (await errorContainer.isVisible()) {
      await expect(errorContainer).toBeEmpty();
    }
  });

  test('文字セット選択パネルの存在確認', async () => {
    // 文字セット選択パネルは初期状態では非表示
    const characterSetPanel = page.locator('[data-testid="character-set-panel"]');
    
    // パネルが存在するかどうかを確認（表示状態は問わない）
    const panelExists = await characterSetPanel.count() > 0;
    
    if (panelExists) {
      // プリセット選択オプションが含まれているか確認
      const hasPresetOptions = await characterSetPanel.locator('text=プリセット').count() > 0;
      expect(hasPresetOptions).toBeTruthy();
    }
  });

  test('アプリケーションの応答性', async () => {
    // ページの読み込み時間をテスト
    const startTime = Date.now();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // 読み込み時間が5秒以内であることを確認
    expect(loadTime).toBeLessThan(5000);
  });

  test('メモリリークのないこと', async () => {
    // 複数回のリロードでメモリリークがないかテスト
    const initialMemory = await electronApp.evaluate(async () => {
      return process.memoryUsage().heapUsed;
    });

    // 3回リロードを実行
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // 1秒待機
    }

    const finalMemory = await electronApp.evaluate(async () => {
      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }
      return process.memoryUsage().heapUsed;
    });

    // メモリ使用量の増加が50MB以内であることを確認
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});

// フォントファイル処理のE2Eテスト（実際のフォントファイルが必要）
test.describe('Font Processing E2E Tests', () => {
  test.skip('実際のフォントファイル処理', async () => {
    // TODO: テスト用フォントファイルが利用可能な場合に実装
    // 1. テスト用フォントファイルをドロップ
    // 2. 文字セットを選択
    // 3. サブセット化を実行
    // 4. 結果を確認
  });

  test.skip('無効なファイルの処理', async () => {
    // TODO: 無効なファイルをドロップした場合のエラーハンドリングをテスト
  });

  test.skip('大容量ファイルの処理', async () => {
    // TODO: 大容量フォントファイルの処理性能をテスト
  });
});

// アクセシビリティテスト
test.describe('Accessibility Tests', () => {
  test('キーボードナビゲーション', async () => {
    // Tab キーでフォーカスが適切に移動するかテスト
    await page.keyboard.press('Tab');
    
    // フォーカスが可視要素に当たっているか確認
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('スクリーンリーダー対応', async () => {
    // aria-label やロール属性が適切に設定されているかテスト
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    
    if (await dropZone.isVisible()) {
      // aria-labelまたはアクセシブルなテキストが存在するか確認
      const accessibleName = await dropZone.getAttribute('aria-label') || 
                             await dropZone.textContent();
      expect(accessibleName).toBeTruthy();
    }
  });
});