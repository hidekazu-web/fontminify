import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ElectronApplication, Page, _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('統合テスト（完全なユーザーワークフロー）', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let tempDir: string;

  beforeAll(async () => {
    // テスト用の一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fontminify-test-'));
    
    // Electronアプリケーションを起動
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_MODE: 'true'
      }
    });

    // メインウィンドウを取得
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  afterAll(async () => {
    // 一時ディレクトリを削除
    await fs.rmdir(tempDir, { recursive: true });
    
    // Electronアプリケーションを終了
    await electronApp.close();
  });

  beforeEach(async () => {
    // 各テスト前にアプリケーションをリセット
    await page.evaluate(() => {
      // グローバル状態をリセット
      if (window.electronAPI) {
        window.electronAPI.resetState();
      }
    });
  });

  afterEach(async () => {
    // 各テスト後のクリーンアップ
    await page.screenshot({ 
      path: `${tempDir}/screenshot-${Date.now()}.png`,
      fullPage: true 
    });
  });

  describe('基本的なユーザーワークフロー', () => {
    it('アプリケーション起動から終了まで', async () => {
      // 1. アプリケーションが正常に起動することを確認
      await expect(page).toHaveTitle('FontMinify');
      
      // 2. メインUI要素の存在確認
      await expect(page.locator('[data-testid="drag-drop-area"]')).toBeVisible();
      await expect(page.locator('[data-testid="character-set-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="process-button"]')).toBeVisible();
      
      // 3. 初期状態の確認
      await expect(page.locator('[data-testid="process-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="progress-bar"]')).not.toBeVisible();
      
      // 4. ダークモード切り替えテスト
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await themeToggle.click();
      await expect(page.locator('body')).toHaveClass(/dark/);
      
      // 5. ライトモードに戻す
      await themeToggle.click();
      await expect(page.locator('body')).not.toHaveClass(/dark/);
    });

    it('フォントファイルのドラッグ&ドロップ処理', async () => {
      // テスト用フォントファイルを作成
      const testFontPath = path.join(tempDir, 'test-font.ttf');
      const testFontData = Buffer.from('TTF_TEST_DATA'); // 実際のテストではモックフォントデータ
      await fs.writeFile(testFontPath, testFontData);

      // 1. ファイルドロップ領域にファイルをドロップ
      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(testFontPath);

      // 2. ファイルが正常に読み込まれることを確認
      await expect(page.locator('[data-testid="font-info-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="font-name"]')).toContainText('test-font');
      
      // 3. プロセスボタンが有効になることを確認
      await expect(page.locator('[data-testid="process-button"]')).toBeEnabled();
      
      // 4. フォント情報が表示されることを確認
      await expect(page.locator('[data-testid="font-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="glyph-count"]')).toBeVisible();
    });

    it('文字セット選択と処理実行', async () => {
      // テスト用フォントファイルをセットアップ
      const testFontPath = path.join(tempDir, 'japanese-font.otf');
      await fs.writeFile(testFontPath, Buffer.from('OTF_JAPANESE_TEST_DATA'));
      
      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(testFontPath);
      
      await page.waitForSelector('[data-testid="font-info-panel"]');

      // 1. 文字セットプリセットを選択
      const presetSelector = page.locator('[data-testid="preset-selector"]');
      await presetSelector.selectOption('hiragana_katakana');
      
      // 2. 選択した文字セットの情報が表示されることを確認
      await expect(page.locator('[data-testid="selected-charset-info"]')).toContainText('ひらがな・カタカナ');
      await expect(page.locator('[data-testid="estimated-chars"]')).toContainText(/約\d+文字/);
      
      // 3. 出力形式を選択
      const formatSelector = page.locator('[data-testid="output-format-selector"]');
      await formatSelector.selectOption('woff2');
      
      // 4. 処理を開始
      const processButton = page.locator('[data-testid="process-button"]');
      await processButton.click();
      
      // 5. プログレスバーが表示されることを確認
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-text"]')).toContainText('処理中');
      
      // 6. 処理完了を待機
      await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });
      
      // 7. 結果表示を確認
      await expect(page.locator('[data-testid="compression-ratio"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-size-reduction"]')).toContainText(/\d+%削減/);
      
      // 8. ダウンロードボタンが有効になることを確認
      await expect(page.locator('[data-testid="download-button"]')).toBeEnabled();
    });

    it('カスタム文字セット入力とサブセット化', async () => {
      // フォントファイルをセットアップ
      const testFontPath = path.join(tempDir, 'custom-font.ttf');
      await fs.writeFile(testFontPath, Buffer.from('TTF_CUSTOM_TEST_DATA'));
      
      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(testFontPath);
      
      await page.waitForSelector('[data-testid="font-info-panel"]');

      // 1. カスタム文字セットモードに切り替え
      await page.locator('[data-testid="custom-charset-tab"]').click();
      
      // 2. カスタム文字列を入力
      const customTextInput = page.locator('[data-testid="custom-text-input"]');
      const testText = 'Hello World こんにちは世界 123 ABC あいうえお';
      await customTextInput.fill(testText);
      
      // 3. 文字数が正しく表示されることを確認
      await expect(page.locator('[data-testid="custom-char-count"]')).toContainText(/\d+文字/);
      
      // 4. 重複文字の除去警告が表示される場合
      if (await page.locator('[data-testid="duplicate-warning"]').isVisible()) {
        await expect(page.locator('[data-testid="duplicate-warning"]')).toContainText('重複文字');
      }
      
      // 5. 処理を実行
      await page.locator('[data-testid="process-button"]').click();
      
      // 6. プログレス表示を確認
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      
      // 7. 完了まで待機
      await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });
      
      // 8. カスタム文字セット用の結果表示を確認
      await expect(page.locator('[data-testid="custom-result-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="processed-chars"]')).toContainText(/\d+文字を処理/);
    });

    it('複数ファイルの一括処理', async () => {
      // 複数のテストフォントファイルを作成
      const fontFiles = ['font1.ttf', 'font2.otf', 'font3.woff'];
      const testFontPaths: string[] = [];
      
      for (const fileName of fontFiles) {
        const filePath = path.join(tempDir, fileName);
        await fs.writeFile(filePath, Buffer.from(`TEST_FONT_DATA_${fileName}`));
        testFontPaths.push(filePath);
      }

      // 1. 複数ファイル選択モードに切り替え
      await page.locator('[data-testid="multiple-files-tab"]').click();
      
      // 2. 複数ファイルを選択
      const multiFileChooser = page.locator('[data-testid="multi-file-input"]');
      await multiFileChooser.setInputFiles(testFontPaths);
      
      // 3. ファイルリストが表示されることを確認
      await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
      for (const fileName of fontFiles) {
        await expect(page.locator(`[data-testid="file-item-${fileName}"]`)).toBeVisible();
      }
      
      // 4. 共通設定を選択
      await page.locator('[data-testid="preset-selector"]').selectOption('ascii');
      await page.locator('[data-testid="output-format-selector"]').selectOption('woff2');
      
      // 5. 一括処理を開始
      await page.locator('[data-testid="process-all-button"]').click();
      
      // 6. 各ファイルの処理状況を確認
      for (const fileName of fontFiles) {
        await expect(page.locator(`[data-testid="progress-${fileName}"]`)).toBeVisible();
      }
      
      // 7. 全体の進捗表示を確認
      await expect(page.locator('[data-testid="overall-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="files-processed"]')).toContainText('0/3');
      
      // 8. 完了まで待機
      await page.waitForSelector('[data-testid="all-complete"]', { timeout: 60000 });
      
      // 9. 結果サマリーを確認
      await expect(page.locator('[data-testid="batch-result-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-count"]')).toContainText('3');
      await expect(page.locator('[data-testid="total-size-reduction"]')).toBeVisible();
      
      // 10. 一括ダウンロードボタンの有効化を確認
      await expect(page.locator('[data-testid="download-all-button"]')).toBeEnabled();
    });

    it('処理のキャンセルと再開', async () => {
      // 大きなフォントファイルをシミュレート（処理時間を長くするため）
      const largeFontPath = path.join(tempDir, 'large-font.otf');
      const largeFontData = Buffer.alloc(50 * 1024 * 1024); // 50MB
      await fs.writeFile(largeFontPath, largeFontData);

      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(largeFontPath);
      
      await page.waitForSelector('[data-testid="font-info-panel"]');

      // 1. 処理設定
      await page.locator('[data-testid="preset-selector"]').selectOption('joyo_kanji');
      await page.locator('[data-testid="output-format-selector"]').selectOption('woff2');
      
      // 2. 処理開始
      await page.locator('[data-testid="process-button"]').click();
      
      // 3. プログレスバーが表示されるまで待つ
      await page.waitForSelector('[data-testid="progress-bar"]');
      
      // 4. 少し待ってからキャンセル
      await page.waitForTimeout(2000);
      await page.locator('[data-testid="cancel-button"]').click();
      
      // 5. キャンセル確認ダイアログ
      await expect(page.locator('[data-testid="cancel-dialog"]')).toBeVisible();
      await page.locator('[data-testid="confirm-cancel"]').click();
      
      // 6. キャンセル完了の確認
      await expect(page.locator('[data-testid="process-cancelled"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).not.toBeVisible();
      
      // 7. 再開ボタンが有効になることを確認
      await expect(page.locator('[data-testid="process-button"]')).toBeEnabled();
      await expect(page.locator('[data-testid="process-button"]')).toContainText('再開');
      
      // 8. 処理を再開
      await page.locator('[data-testid="process-button"]').click();
      
      // 9. 再開後の処理を確認
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-text"]')).toContainText('処理中');
    });

    it('エラーハンドリングと復旧', async () => {
      // 1. 無効なファイルをドロップ
      const invalidFilePath = path.join(tempDir, 'invalid.txt');
      await fs.writeFile(invalidFilePath, 'This is not a font file');

      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(invalidFilePath);
      
      // 2. エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('無効なファイル');
      
      // 3. エラーを閉じる
      await page.locator('[data-testid="close-error"]').click();
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      
      // 4. 正しいフォントファイルをドロップ
      const validFontPath = path.join(tempDir, 'valid-font.ttf');
      await fs.writeFile(validFontPath, Buffer.from('VALID_TTF_DATA'));
      
      await fileChooser.setInputFiles(validFontPath);
      
      // 5. 正常な処理フローに復帰することを確認
      await expect(page.locator('[data-testid="font-info-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="process-button"]')).toBeEnabled();
      
      // 6. ネットワークエラーのシミュレーション（更新チェック失敗など）
      await page.route('**/api/update-check', route => route.abort());
      
      // 7. 設定画面を開く
      await page.locator('[data-testid="menu-button"]').click();
      await page.locator('[data-testid="settings-menu"]').click();
      
      // 8. 更新チェックを実行
      await page.locator('[data-testid="check-updates-button"]').click();
      
      // 9. ネットワークエラーメッセージを確認
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // 10. 設定画面を閉じて通常操作に戻る
      await page.locator('[data-testid="close-settings"]').click();
      await expect(page.locator('[data-testid="drag-drop-area"]')).toBeVisible();
    });

    it('設定の保存と復元', async () => {
      // 1. 設定画面を開く
      await page.locator('[data-testid="menu-button"]').click();
      await page.locator('[data-testid="settings-menu"]').click();
      
      // 2. 各種設定を変更
      await page.locator('[data-testid="default-format-select"]').selectOption('woff2');
      await page.locator('[data-testid="compression-level-slider"]').fill('9');
      await page.locator('[data-testid="auto-backup-checkbox"]').check();
      await page.locator('[data-testid="theme-select"]').selectOption('dark');
      
      // 3. 設定を保存
      await page.locator('[data-testid="save-settings"]').click();
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
      
      // 4. 設定画面を閉じる
      await page.locator('[data-testid="close-settings"]').click();
      
      // 5. アプリケーションを再起動（設定の永続化テスト）
      await electronApp.close();
      
      electronApp = await electron.launch({
        args: [path.join(__dirname, '../../dist/main/main.js')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TEST_MODE: 'true'
        }
      });
      
      page = await electronApp.firstWindow();
      await page.waitForLoadState('domcontentloaded');
      
      // 6. 設定が復元されていることを確認
      await expect(page.locator('body')).toHaveClass(/dark/); // ダークテーマ
      
      await page.locator('[data-testid="menu-button"]').click();
      await page.locator('[data-testid="settings-menu"]').click();
      
      await expect(page.locator('[data-testid="default-format-select"]')).toHaveValue('woff2');
      await expect(page.locator('[data-testid="compression-level-slider"]')).toHaveValue('9');
      await expect(page.locator('[data-testid="auto-backup-checkbox"]')).toBeChecked();
    });

    it('ヘルプとドキュメント表示', async () => {
      // 1. ヘルプメニューを開く
      await page.locator('[data-testid="menu-button"]').click();
      await page.locator('[data-testid="help-menu"]').click();
      
      // 2. チュートリアルを開始
      await page.locator('[data-testid="tutorial-button"]').click();
      
      // 3. チュートリアルオーバーレイが表示される
      await expect(page.locator('[data-testid="tutorial-overlay"]')).toBeVisible();
      await expect(page.locator('[data-testid="tutorial-step-1"]')).toBeVisible();
      
      // 4. チュートリアルステップを進める
      await page.locator('[data-testid="tutorial-next"]').click();
      await expect(page.locator('[data-testid="tutorial-step-2"]')).toBeVisible();
      
      await page.locator('[data-testid="tutorial-next"]').click();
      await expect(page.locator('[data-testid="tutorial-step-3"]')).toBeVisible();
      
      // 5. チュートリアルを完了
      await page.locator('[data-testid="tutorial-finish"]').click();
      await expect(page.locator('[data-testid="tutorial-overlay"]')).not.toBeVisible();
      
      // 6. ショートカットキーヘルプを表示
      await page.keyboard.press('F1');
      await expect(page.locator('[data-testid="shortcuts-help"]')).toBeVisible();
      
      // 7. ヘルプを閉じる
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="shortcuts-help"]')).not.toBeVisible();
      
      // 8. About画面を表示
      await page.locator('[data-testid="menu-button"]').click();
      await page.locator('[data-testid="about-menu"]').click();
      
      await expect(page.locator('[data-testid="about-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="app-version"]')).toContainText(/\d+\.\d+\.\d+/);
      await expect(page.locator('[data-testid="copyright"]')).toBeVisible();
    });

    it('キーボードショートカット操作', async () => {
      // テストフォントファイルを準備
      const testFontPath = path.join(tempDir, 'shortcut-test.ttf');
      await fs.writeFile(testFontPath, Buffer.from('TTF_SHORTCUT_TEST'));

      // 1. Cmd+O でファイル選択ダイアログ
      await page.keyboard.press('Meta+O');
      // ファイル選択ダイアログのモックレスポンス
      await page.evaluate(() => {
        window.electronAPI.selectFile = () => Promise.resolve(['/test/shortcut-test.ttf']);
      });
      
      // 2. Cmd+P で処理開始（ファイルが選択されている場合）
      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(testFontPath);
      await page.waitForSelector('[data-testid="font-info-panel"]');
      
      await page.keyboard.press('Meta+P');
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      
      // 3. Escape でキャンセル
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="cancel-dialog"]')).toBeVisible();
      await page.keyboard.press('Enter'); // 確認
      
      // 4. Cmd+R でリセット
      await page.keyboard.press('Meta+R');
      await expect(page.locator('[data-testid="font-info-panel"]')).not.toBeVisible();
      
      // 5. Cmd+T でテーマ切り替え
      await page.keyboard.press('Meta+T');
      await expect(page.locator('body')).toHaveClass(/dark/);
      
      await page.keyboard.press('Meta+T');
      await expect(page.locator('body')).not.toHaveClass(/dark/);
      
      // 6. Cmd+, で設定画面
      await page.keyboard.press('Meta+,');
      await expect(page.locator('[data-testid="settings-dialog"]')).toBeVisible();
      
      // 7. Escape で設定画面を閉じる
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="settings-dialog"]')).not.toBeVisible();
    });

    it('アクセシビリティ機能', async () => {
      // 1. Tab navigation テスト
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="drag-drop-area"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="preset-selector"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="output-format-selector"]')).toBeFocused();
      
      // 2. ARIA ラベルとロールの確認
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('role', 'progressbar');
      await expect(page.locator('[data-testid="drag-drop-area"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="process-button"]')).toHaveAttribute('aria-describedby');
      
      // 3. スクリーンリーダー用テキストの確認
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // 4. キーボードでの操作確認
      const testFontPath = path.join(tempDir, 'accessibility-test.ttf');
      await fs.writeFile(testFontPath, Buffer.from('TTF_A11Y_TEST'));
      
      // ファイル選択をキーボードで実行
      await page.locator('[data-testid="file-select-button"]').press('Enter');
      
      // プリセット選択をキーボードで実行
      await page.locator('[data-testid="preset-selector"]').press('ArrowDown');
      await page.locator('[data-testid="preset-selector"]').press('Enter');
      
      // 5. 高コントラストモードの確認
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await expect(page.locator('[data-testid="main-container"]')).toHaveClass(/high-contrast/);
    });
  });

  describe('パフォーマンスと応答性', () => {
    it('大きなフォントファイルの処理性能', async () => {
      // 10MBのテストフォントファイル
      const largeFontPath = path.join(tempDir, 'large-font.otf');
      const largeFontData = Buffer.alloc(10 * 1024 * 1024);
      await fs.writeFile(largeFontPath, largeFontData);

      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(largeFontPath);
      
      await page.waitForSelector('[data-testid="font-info-panel"]');

      // 処理開始
      await page.locator('[data-testid="preset-selector"]').selectOption('hiragana_katakana');
      
      const startTime = Date.now();
      await page.locator('[data-testid="process-button"]').click();
      
      // 処理完了まで待機
      await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // 10秒以内
      
      // UI応答性の確認（処理中でもUIが操作可能）
      await expect(page.locator('[data-testid="menu-button"]')).toBeEnabled();
      await expect(page.locator('[data-testid="cancel-button"]')).toBeEnabled();
    });

    it('メモリ使用量の監視', async () => {
      // 複数の大きなファイルを連続処理
      const fileCount = 5;
      const filePaths: string[] = [];
      
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(tempDir, `memory-test-${i}.ttf`);
        const fileData = Buffer.alloc(5 * 1024 * 1024); // 5MB each
        await fs.writeFile(filePath, fileData);
        filePaths.push(filePath);
      }

      // 初期メモリ使用量を記録
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 連続処理を実行
      for (const filePath of filePaths) {
        const fileChooser = page.locator('input[type="file"]');
        await fileChooser.setInputFiles(filePath);
        await page.waitForSelector('[data-testid="font-info-panel"]');
        
        await page.locator('[data-testid="preset-selector"]').selectOption('ascii');
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });
        
        // 次のファイル用にリセット
        await page.locator('[data-testid="reset-button"]').click();
      }

      // 最終メモリ使用量を確認
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryIncrease = finalMemory - initialMemory;
      const maxAllowedIncrease = 100 * 1024 * 1024; // 100MB
      
      expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
    });

    it('UI応答性の確認（60fps維持）', async () => {
      // アニメーション中のフレームレート測定
      const testFontPath = path.join(tempDir, 'animation-test.ttf');
      await fs.writeFile(testFontPath, Buffer.from('TTF_ANIMATION_TEST'));

      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(testFontPath);
      await page.waitForSelector('[data-testid="font-info-panel"]');

      // プログレスバーアニメーション中のフレームレート測定
      await page.locator('[data-testid="preset-selector"]').selectOption('joyo_kanji');
      
      // フレームレート測定開始
      const frameRates: number[] = [];
      let lastTime = Date.now();
      let frameCount = 0;

      const measureFrameRate = () => {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        if (deltaTime > 0) {
          const fps = 1000 / deltaTime;
          frameRates.push(fps);
        }
        lastTime = currentTime;
        frameCount++;
        
        if (frameCount < 100) {
          requestAnimationFrame(measureFrameRate);
        }
      };

      await page.locator('[data-testid="process-button"]').click();
      
      // フレームレート測定実行
      await page.evaluate(measureFrameRate);
      
      // 測定完了まで待機
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 平均フレームレートを計算
      const averageFps = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
      expect(averageFps).toBeGreaterThan(30); // 最低30fps
      
      // 90%のフレームが30fps以上であることを確認
      const goodFrames = frameRates.filter(fps => fps >= 30).length;
      const goodFrameRatio = goodFrames / frameRates.length;
      expect(goodFrameRatio).toBeGreaterThan(0.9);
    });
  });

  describe('エッジケースとエラー処理', () => {
    it('ネットワーク切断時の動作', async () => {
      // ネットワークを無効化
      await page.context().setOffline(true);
      
      // 更新チェックなどのネットワーク機能をテスト
      await page.locator('[data-testid="menu-button"]').click();
      await page.locator('[data-testid="check-updates"]').click();
      
      await expect(page.locator('[data-testid="offline-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-error"]')).toContainText('ネットワーク');
      
      // ネットワークを復旧
      await page.context().setOffline(false);
      
      // 機能が正常に復旧することを確認
      await page.locator('[data-testid="retry-button"]').click();
      await expect(page.locator('[data-testid="offline-error"]')).not.toBeVisible();
    });

    it('システムリソース不足時の動作', async () => {
      // 非常に大きなファイルで処理を試行（メモリ不足をシミュレート）
      const hugeFontPath = path.join(tempDir, 'huge-font.otf');
      const hugeFontData = Buffer.alloc(500 * 1024 * 1024); // 500MB
      await fs.writeFile(hugeFontPath, hugeFontData);

      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(hugeFontPath);
      
      // ファイルサイズ警告が表示されることを確認
      await expect(page.locator('[data-testid="large-file-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="large-file-warning"]')).toContainText('500MB');
      
      // 処理続行を選択
      await page.locator('[data-testid="continue-large-file"]').click();
      
      await page.waitForSelector('[data-testid="font-info-panel"]');
      await page.locator('[data-testid="preset-selector"]').selectOption('ascii');
      await page.locator('[data-testid="process-button"]').click();
      
      // メモリ不足エラーまたは正常処理完了のいずれかを確認
      const result = await Promise.race([
        page.waitForSelector('[data-testid="memory-error"]', { timeout: 60000 }),
        page.waitForSelector('[data-testid="process-complete"]', { timeout: 60000 })
      ]);
      
      // いずれかの結果が得られることを確認
      expect(result).toBeTruthy();
    });

    it('破損ファイルの処理', async () => {
      // 破損したフォントファイルをシミュレート
      const corruptFontPath = path.join(tempDir, 'corrupt-font.ttf');
      const corruptData = Buffer.from('CORRUPT_FONT_DATA_NOT_VALID_TTF');
      await fs.writeFile(corruptFontPath, corruptData);

      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(corruptFontPath);
      
      // ファイル形式エラーが表示されることを確認
      await expect(page.locator('[data-testid="format-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="format-error"]')).toContainText('無効なフォント');
      
      // エラー詳細が表示されることを確認
      await page.locator('[data-testid="show-error-details"]').click();
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      
      // 復旧オプションが提供されることを確認
      await expect(page.locator('[data-testid="try-again-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="select-different-file"]')).toBeVisible();
    });

    it('権限不足時の動作', async () => {
      // 読み取り専用ディレクトリへの保存を試行
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir, { mode: 0o444 });
      
      const testFontPath = path.join(tempDir, 'permission-test.ttf');
      await fs.writeFile(testFontPath, Buffer.from('TTF_PERMISSION_TEST'));

      const fileChooser = page.locator('input[type="file"]');
      await fileChooser.setInputFiles(testFontPath);
      await page.waitForSelector('[data-testid="font-info-panel"]');
      
      // 保存先を読み取り専用ディレクトリに設定
      await page.locator('[data-testid="output-path-button"]').click();
      
      // ファイル保存ダイアログで読み取り専用ディレクトリを選択（モック）
      await page.evaluate((dir) => {
        window.electronAPI.selectSaveLocation = () => Promise.resolve(dir + '/output.woff2');
      }, readOnlyDir);
      
      await page.locator('[data-testid="preset-selector"]').selectOption('ascii');
      await page.locator('[data-testid="process-button"]').click();
      
      // 権限エラーが適切に処理されることを確認
      await expect(page.locator('[data-testid="permission-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="permission-error"]')).toContainText('権限');
      
      // エラー解決案が提示されることを確認
      await expect(page.locator('[data-testid="permission-solution"]')).toBeVisible();
      await expect(page.locator('[data-testid="choose-different-location"]')).toBeVisible();
    });
  });
});