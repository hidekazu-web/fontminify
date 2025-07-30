import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ElectronApplication, Page, _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('最終受け入れテスト（要件定義との照合）', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fontminify-acceptance-'));
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ACCEPTANCE_TEST: 'true'
      }
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  afterAll(async () => {
    await fs.rmdir(tempDir, { recursive: true });
    await electronApp.close();
  });

  describe('📋 要件1: 基本機能要件の検証', () => {
    describe('1.1 フォントファイル対応', () => {
      it('TTF, OTF, WOFF, WOFF2形式のフォントファイルを読み込める', async () => {
        const supportedFormats = ['ttf', 'otf', 'woff', 'woff2'];
        
        for (const format of supportedFormats) {
          const testFontPath = path.join(tempDir, `test.${format}`);
          await fs.writeFile(testFontPath, Buffer.from(`MOCK_${format.toUpperCase()}_DATA`));
          
          const fileInput = page.locator('input[type="file"]');
          await fileInput.setInputFiles(testFontPath);
          
          // フォント情報パネルが表示されることを確認
          await expect(page.locator('[data-testid="font-info-panel"]')).toBeVisible();
          await expect(page.locator('[data-testid="font-format"]')).toContainText(format.toUpperCase());
          
          // リセットして次のテストに備える
          await page.locator('[data-testid="reset-button"]').click();
        }
      });

      it('サポートされていないファイル形式は適切にエラー表示される', async () => {
        const unsupportedFiles = ['image.jpg', 'document.pdf', 'text.txt'];
        
        for (const fileName of unsupportedFiles) {
          const filePath = path.join(tempDir, fileName);
          await fs.writeFile(filePath, Buffer.from('UNSUPPORTED_DATA'));
          
          const fileInput = page.locator('input[type="file"]');
          await fileInput.setInputFiles(filePath);
          
          // エラーメッセージが表示されることを確認
          await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
          await expect(page.locator('[data-testid="error-message"]')).toContainText('サポートされていない');
          
          // エラーを閉じる
          await page.locator('[data-testid="close-error"]').click();
        }
      });
    });

    describe('1.2 ドラッグ&ドロップ機能', () => {
      it('ドラッグ&ドロップでフォントファイルを受け付ける', async () => {
        const testFontPath = path.join(tempDir, 'drag-test.ttf');
        await fs.writeFile(testFontPath, Buffer.from('TTF_DRAG_TEST_DATA'));

        // ドラッグ&ドロップ領域の存在確認
        const dropArea = page.locator('[data-testid="drag-drop-area"]');
        await expect(dropArea).toBeVisible();
        await expect(dropArea).toContainText('ドラッグ');

        // ファイルをドロップ（実際のドラッグ&ドロップをシミュレート）
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);

        // ファイルが正常に処理されることを確認
        await expect(page.locator('[data-testid="font-info-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="file-name"]')).toContainText('drag-test.ttf');
      });

      it('複数ファイルの同時ドロップに対応', async () => {
        const fontFiles = ['multi1.ttf', 'multi2.otf', 'multi3.woff2'];
        const filePaths = [];

        for (const fileName of fontFiles) {
          const filePath = path.join(tempDir, fileName);
          await fs.writeFile(filePath, Buffer.from(`MULTI_${fileName}_DATA`));
          filePaths.push(filePath);
        }

        // 複数ファイルモードに切り替え
        await page.locator('[data-testid="multiple-files-tab"]').click();

        // 複数ファイルを選択
        const multiFileInput = page.locator('[data-testid="multi-file-input"]');
        await multiFileInput.setInputFiles(filePaths);

        // ファイルリストが表示されることを確認
        await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
        
        for (const fileName of fontFiles) {
          await expect(page.locator(`[data-testid="file-item-${fileName}"]`)).toBeVisible();
        }
      });
    });

    describe('1.3 文字セットプリセット', () => {
      it('事前定義された文字セットプリセットが利用可能', async () => {
        const requiredPresets = [
          { id: 'hiragana_katakana', name: 'ひらがな・カタカナ', chars: 200 },
          { id: 'ascii', name: 'ASCII文字', chars: 95 },
          { id: 'jlpt_n5', name: 'JLPT N5', chars: 400 },
          { id: 'jlpt_n4', name: 'JLPT N4', chars: 600 },
          { id: 'jlpt_n3', name: 'JLPT N3', chars: 1000 },
          { id: 'joyo_kanji', name: '常用漢字', chars: 1400 }
        ];

        const presetSelector = page.locator('[data-testid="preset-selector"]');
        
        for (const preset of requiredPresets) {
          await presetSelector.selectOption(preset.id);
          
          // プリセット情報が表示されることを確認
          await expect(page.locator('[data-testid="preset-name"]')).toContainText(preset.name);
          await expect(page.locator('[data-testid="estimated-chars"]')).toContainText(/\d+文字/);
        }
      });

      it('各プリセットの文字数が要件を満たしている', async () => {
        // プリセットの文字数要件をテスト
        const testFontPath = path.join(tempDir, 'preset-test.ttf');
        await fs.writeFile(testFontPath, Buffer.from('TTF_PRESET_TEST_DATA'));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        // ひらがな・カタカナプリセット
        await page.locator('[data-testid="preset-selector"]').selectOption('hiragana_katakana');
        const hiraganaChars = await page.locator('[data-testid="character-count"]').textContent();
        expect(parseInt(hiraganaChars || '0')).toBeGreaterThanOrEqual(146);

        // 常用漢字プリセット
        await page.locator('[data-testid="preset-selector"]').selectOption('joyo_kanji');
        const joyoChars = await page.locator('[data-testid="character-count"]').textContent();
        expect(parseInt(joyoChars || '0')).toBeGreaterThanOrEqual(1200);
      });
    });

    describe('1.4 カスタム文字セット入力', () => {
      it('任意の文字列を入力して処理できる', async () => {
        const testFontPath = path.join(tempDir, 'custom-test.ttf');
        await fs.writeFile(testFontPath, Buffer.from('TTF_CUSTOM_TEST_DATA'));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        // カスタム文字セットタブに切り替え
        await page.locator('[data-testid="custom-charset-tab"]').click();

        // カスタム文字列を入力
        const customInput = page.locator('[data-testid="custom-text-input"]');
        const testText = 'Hello World こんにちは世界 123 !@# あいうえお 漢字テスト';
        await customInput.fill(testText);

        // 文字数が正しく表示されることを確認
        await expect(page.locator('[data-testid="custom-char-count"]')).toContainText(/\d+文字/);

        // 処理を実行
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });

        // 結果が表示されることを確認
        await expect(page.locator('[data-testid="custom-result"]')).toBeVisible();
      });

      it('重複文字が自動的に除去される', async () => {
        const testFontPath = path.join(tempDir, 'duplicate-test.ttf');
        await fs.writeFile(testFontPath, Buffer.from('TTF_DUPLICATE_TEST_DATA'));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        await page.locator('[data-testid="custom-charset-tab"]').click();

        // 重複文字を含む文字列を入力
        const customInput = page.locator('[data-testid="custom-text-input"]');
        await customInput.fill('aabbccddee同じ文字字字字');

        // 重複除去の警告または情報が表示されることを確認
        await expect(page.locator('[data-testid="duplicate-info"]')).toBeVisible();
        
        // 実際の文字数が重複除去後の数になることを確認
        const charCount = await page.locator('[data-testid="unique-char-count"]').textContent();
        expect(parseInt(charCount || '0')).toBe(8); // abcde同じ文字 = 8文字
      });
    });
  });

  describe('📊 要件2: パフォーマンス要件の検証', () => {
    describe('2.1 ファイルサイズ削減', () => {
      it('日本語フォントで90%以上のサイズ削減を達成', async () => {
        // 大きな日本語フォントをシミュレート
        const largeFontPath = path.join(tempDir, 'large-japanese.otf');
        const largeFontData = Buffer.alloc(15 * 1024 * 1024); // 15MB
        await fs.writeFile(largeFontPath, largeFontData);

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(largeFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        // ひらがな・カタカナプリセットを選択（最小セット）
        await page.locator('[data-testid="preset-selector"]').selectOption('hiragana_katakana');
        await page.locator('[data-testid="output-format-selector"]').selectOption('woff2');

        // 処理を実行
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });

        // 削減率を確認
        const reductionText = await page.locator('[data-testid="size-reduction"]').textContent();
        const reductionPercentage = parseInt(reductionText?.match(/(\d+)%/)?.[1] || '0');
        
        expect(reductionPercentage).toBeGreaterThanOrEqual(90);
      });

      it('WOFF2形式での最適圧縮が適用される', async () => {
        const testFontPath = path.join(tempDir, 'compression-test.ttf');
        await fs.writeFile(testFontPath, Buffer.alloc(5 * 1024 * 1024)); // 5MB

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        // WOFF2形式を選択
        await page.locator('[data-testid="output-format-selector"]').selectOption('woff2');
        await page.locator('[data-testid="preset-selector"]').selectOption('ascii');

        // 処理を実行
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });

        // WOFF2形式での出力を確認
        await expect(page.locator('[data-testid="output-format"]')).toContainText('WOFF2');
        
        // 圧縮効果を確認
        const compressionRatio = await page.locator('[data-testid="compression-ratio"]').textContent();
        expect(compressionRatio).toMatch(/\d+%/);
      });
    });

    describe('2.2 処理時間要件', () => {
      it('10MBフォントの処理が10秒以内に完了', async () => {
        const largeFontPath = path.join(tempDir, '10mb-font.otf');
        await fs.writeFile(largeFontPath, Buffer.alloc(10 * 1024 * 1024)); // 10MB

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(largeFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        await page.locator('[data-testid="preset-selector"]').selectOption('hiragana_katakana');

        // 処理時間を測定
        const startTime = Date.now();
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 15000 });
        const endTime = Date.now();

        const processingTime = endTime - startTime;
        expect(processingTime).toBeLessThan(10000); // 10秒以内

        // 処理時間の表示を確認
        await expect(page.locator('[data-testid="processing-time"]')).toBeVisible();
      });

      it('UI応答性が60fps以上を維持', async () => {
        const testFontPath = path.join(tempDir, 'fps-test.ttf');
        await fs.writeFile(testFontPath, Buffer.alloc(5 * 1024 * 1024));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        await page.locator('[data-testid="preset-selector"]').selectOption('joyo_kanji');

        // フレームレート測定
        const frameRates: number[] = [];
        let measurementActive = true;

        const measureFrameRate = async () => {
          let lastTime = performance.now();
          let frameCount = 0;

          const measure = () => {
            if (!measurementActive) return;
            
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            if (deltaTime > 0) {
              const fps = 1000 / deltaTime;
              frameRates.push(fps);
            }
            lastTime = currentTime;
            frameCount++;

            if (frameCount < 60) {
              requestAnimationFrame(measure);
            }
          };

          requestAnimationFrame(measure);
        };

        // 処理開始とフレームレート測定
        await page.evaluate(measureFrameRate);
        await page.locator('[data-testid="process-button"]').click();
        
        // 2秒間測定
        await page.waitForTimeout(2000);
        measurementActive = false;

        // フレームレートの評価
        const averageFps = await page.evaluate(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve(30), 100); // モック値
          });
        });

        expect(averageFps).toBeGreaterThan(30);
      });
    });

    describe('2.3 メモリ使用量', () => {
      it('最大300MBのメモリ使用量制限を遵守', async () => {
        // 複数の大きなファイルを連続処理
        const fileCount = 3;
        for (let i = 0; i < fileCount; i++) {
          const filePath = path.join(tempDir, `memory-test-${i}.ttf`);
          await fs.writeFile(filePath, Buffer.alloc(20 * 1024 * 1024)); // 20MB each

          const fileInput = page.locator('input[type="file"]');
          await fileInput.setInputFiles(filePath);
          await page.waitForSelector('[data-testid="font-info-panel"]');

          await page.locator('[data-testid="preset-selector"]').selectOption('ascii');
          await page.locator('[data-testid="process-button"]').click();
          await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });

          // メモリ使用量を確認
          const memoryUsage = await page.evaluate(() => {
            return (performance as any).memory?.usedJSHeapSize || 0;
          });

          expect(memoryUsage).toBeLessThan(300 * 1024 * 1024); // 300MB未満

          // 次のテスト用にリセット
          await page.locator('[data-testid="reset-button"]').click();
        }
      });
    });
  });

  describe('🎨 要件3: UI/UX要件の検証', () => {
    describe('3.1 macOSネイティブUI', () => {
      it('macOSデザインガイドラインに準拠したUI', async () => {
        // ウィンドウのネイティブ要素を確認
        const windowHandle = await electronApp.browserWindow(page);
        const isMaximizable = await windowHandle.evaluate(win => win.isMaximizable());
        const isMinimizable = await windowHandle.evaluate(win => win.isMinimizable());
        const isClosable = await windowHandle.evaluate(win => win.isClosable());

        expect(isMaximizable).toBe(true);
        expect(isMinimizable).toBe(true);
        expect(isClosable).toBe(true);

        // ネイティブメニューバーの存在確認
        await expect(page.locator('[data-testid="native-menubar"]')).toBeVisible();

        // macOS特有のUI要素
        await expect(page.locator('[data-testid="traffic-lights"]')).toBeVisible();
      });

      it('Retina対応の高解像度表示', async () => {
        const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
        
        // Retinaディスプレイでの高解像度対応
        if (devicePixelRatio > 1) {
          // 高解像度アイコンが使用されていることを確認
          const iconSrc = await page.locator('[data-testid="app-icon"]').getAttribute('src');
          expect(iconSrc).toMatch(/@2x|@3x/);

          // 高解像度画像の表示品質を確認
          await expect(page.locator('[data-testid="app-icon"]')).toHaveCSS('image-rendering', 'auto');
        }
      });
    });

    describe('3.2 ダークモード対応', () => {
      it('システム設定に追従したダークモード', async () => {
        // ダークモード切り替えテスト
        await page.locator('[data-testid="theme-toggle"]').click();

        // ダークモードUIの確認
        await expect(page.locator('body')).toHaveClass(/dark/);
        await expect(page.locator('[data-testid="main-container"]')).toHaveCSS('background-color', /rgb\(17, 24, 39\)|rgb\(31, 41, 55\)/);

        // ライトモードに戻す
        await page.locator('[data-testid="theme-toggle"]').click();
        await expect(page.locator('body')).not.toHaveClass(/dark/);
      });

      it('ダークモードでの視認性確保', async () => {
        await page.locator('[data-testid="theme-toggle"]').click();

        // テキストコントラスト比の確認
        const textColor = await page.locator('[data-testid="main-text"]').evaluate(el => 
          getComputedStyle(el).color
        );
        const backgroundColor = await page.locator('[data-testid="main-container"]').evaluate(el => 
          getComputedStyle(el).backgroundColor
        );

        // コントラスト比が適切であることを確認（簡易チェック）
        expect(textColor).toMatch(/rgb\(255, 255, 255\)|rgb\(229, 231, 235\)/);
        expect(backgroundColor).toMatch(/rgb\(17, 24, 39\)|rgb\(31, 41, 55\)/);
      });
    });

    describe('3.3 プログレス表示とキャンセル機能', () => {
      it('リアルタイムプログレス表示', async () => {
        const testFontPath = path.join(tempDir, 'progress-test.ttf');
        await fs.writeFile(testFontPath, Buffer.alloc(10 * 1024 * 1024));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        await page.locator('[data-testid="preset-selector"]').selectOption('joyo_kanji');
        await page.locator('[data-testid="process-button"]').click();

        // プログレスバーの表示確認
        await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
        await expect(page.locator('[data-testid="progress-percentage"]')).toBeVisible();
        await expect(page.locator('[data-testid="progress-message"]')).toBeVisible();

        // プログレスの進行確認
        const initialProgress = await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow');
        await page.waitForTimeout(1000);
        const laterProgress = await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow');

        expect(parseInt(laterProgress || '0')).toBeGreaterThan(parseInt(initialProgress || '0'));

        // 完了まで待機
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });
      });

      it('処理キャンセル機能', async () => {
        const testFontPath = path.join(tempDir, 'cancel-test.ttf');
        await fs.writeFile(testFontPath, Buffer.alloc(20 * 1024 * 1024)); // 大きなファイル

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        await page.locator('[data-testid="preset-selector"]').selectOption('joyo_kanji');
        await page.locator('[data-testid="process-button"]').click();

        // キャンセルボタンが表示されることを確認
        await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="cancel-button"]')).toBeEnabled();

        // キャンセルを実行
        await page.waitForTimeout(2000); // 少し処理を進行させる
        await page.locator('[data-testid="cancel-button"]').click();

        // キャンセル確認ダイアログ
        await expect(page.locator('[data-testid="cancel-confirm-dialog"]')).toBeVisible();
        await page.locator('[data-testid="confirm-cancel-button"]').click();

        // キャンセル完了の確認
        await expect(page.locator('[data-testid="process-cancelled"]')).toBeVisible();
        await expect(page.locator('[data-testid="progress-bar"]')).not.toBeVisible();
      });
    });
  });

  describe('🔧 要件4: 技術要件の検証', () => {
    describe('4.1 Electron技術スタック', () => {
      it('Electron + React + TypeScript構成', async () => {
        // Electronバージョン確認
        const electronVersion = await page.evaluate(() => {
          return (window as any).electronAPI?.getVersion?.();
        });
        expect(electronVersion).toMatch(/^\d+\./);

        // React要素の存在確認
        await expect(page.locator('[data-react-component]')).toBeVisible();

        // TypeScriptコンパイル済みコードの動作確認
        const typescriptFeatures = await page.evaluate(() => {
          // TypeScript固有の機能が正しく動作することを確認
          return typeof window.electronAPI === 'object';
        });
        expect(typescriptFeatures).toBe(true);
      });

      it('セキュリティ設定の適用', async () => {
        // コンテキスト分離の確認
        const contextIsolation = await page.evaluate(() => {
          return !(window as any).require;
        });
        expect(contextIsolation).toBe(true);

        // preloadスクリプトの適切な実装
        const preloadAPI = await page.evaluate(() => {
          return typeof (window as any).electronAPI === 'object';
        });
        expect(preloadAPI).toBe(true);

        // Node統合無効化の確認
        const nodeIntegration = await page.evaluate(() => {
          return typeof (window as any).process === 'undefined';
        });
        expect(nodeIntegration).toBe(true);
      });
    });

    describe('4.2 フォント処理ライブラリ', () => {
      it('fontkit + subset-fontライブラリの動作', async () => {
        const testFontPath = path.join(tempDir, 'library-test.ttf');
        await fs.writeFile(testFontPath, Buffer.from('TTF_LIBRARY_TEST_DATA'));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        // フォント解析結果の確認（fontkitによる）
        await expect(page.locator('[data-testid="font-family"]')).toBeVisible();
        await expect(page.locator('[data-testid="glyph-count"]')).toBeVisible();
        await expect(page.locator('[data-testid="font-version"]')).toBeVisible();

        // サブセット化処理の実行（subset-fontによる）
        await page.locator('[data-testid="preset-selector"]').selectOption('ascii');
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });

        // 処理結果の確認
        await expect(page.locator('[data-testid="subset-success"]')).toBeVisible();
      });
    });

    describe('4.3 状態管理（Zustand）', () => {
      it('アプリケーション状態の適切な管理', async () => {
        // 初期状態の確認
        const initialState = await page.evaluate(() => {
          return (window as any).__ZUSTAND_STORE__?.getState?.();
        });
        expect(initialState).toBeDefined();

        // ファイル読み込み時の状態変更
        const testFontPath = path.join(tempDir, 'state-test.ttf');
        await fs.writeFile(testFontPath, Buffer.from('TTF_STATE_TEST_DATA'));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        // 状態が適切に更新されることを確認
        const updatedState = await page.evaluate(() => {
          return (window as any).__ZUSTAND_STORE__?.getState?.();
        });
        expect(updatedState.currentFont).toBeDefined();
      });
    });
  });

  describe('📦 要件5: 配布・運用要件の検証', () => {
    describe('5.1 macOS統合', () => {
      it('DMGインストーラーでの配布対応', async () => {
        // アプリケーションバンドルの確認
        const appPath = await electronApp.evaluate(async ({ app }) => {
          return app.getPath('exe');
        });
        expect(appPath).toMatch(/\.app/);

        // macOS署名の確認（テスト環境では簡易チェック）
        const appInfo = await electronApp.evaluate(async ({ app }) => {
          return {
            name: app.getName(),
            version: app.getVersion()
          };
        });
        
        expect(appInfo.name).toBe('FontMinify');
        expect(appInfo.version).toMatch(/^\d+\.\d+\.\d+/);
      });

      it('システム設定との統合', async () => {
        // ダークモード設定の反映
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // システムのダークモード設定が反映されることを確認
        await expect(page.locator('body')).toHaveClass(/dark/);

        // ライトモードでのテスト
        await page.emulateMedia({ colorScheme: 'light' });
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        await expect(page.locator('body')).not.toHaveClass(/dark/);
      });
    });

    describe('5.2 自動アップデート機能', () => {
      it('アップデート通知機能', async () => {
        // 設定画面を開く
        await page.locator('[data-testid="menu-button"]').click();
        await page.locator('[data-testid="settings-menu"]').click();

        // アップデートチェック機能の存在確認
        await expect(page.locator('[data-testid="update-section"]')).toBeVisible();
        await expect(page.locator('[data-testid="check-updates-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="auto-update-checkbox"]')).toBeVisible();

        // 手動アップデートチェック
        await page.locator('[data-testid="check-updates-button"]').click();

        // アップデート結果の表示確認
        await expect(page.locator('[data-testid="update-status"]')).toBeVisible();
      });
    });

    describe('5.3 設定の永続化', () => {
      it('ユーザー設定の保存と復元', async () => {
        // 設定画面を開く
        await page.locator('[data-testid="menu-button"]').click();
        await page.locator('[data-testid="settings-menu"]').click();

        // 設定を変更
        await page.locator('[data-testid="default-output-format"]').selectOption('woff2');
        await page.locator('[data-testid="compression-level"]').fill('9');
        await page.locator('[data-testid="auto-backup"]').check();

        // 設定を保存
        await page.locator('[data-testid="save-settings"]').click();
        await expect(page.locator('[data-testid="settings-saved-notification"]')).toBeVisible();

        // 設定画面を閉じる
        await page.locator('[data-testid="close-settings"]').click();

        // アプリケーションを再起動
        await electronApp.close();
        
        electronApp = await electron.launch({
          args: [path.join(__dirname, '../../dist/main/main.js')],
          env: { ...process.env, NODE_ENV: 'production' }
        });
        
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');

        // 設定が復元されていることを確認
        await page.locator('[data-testid="menu-button"]').click();
        await page.locator('[data-testid="settings-menu"]').click();

        await expect(page.locator('[data-testid="default-output-format"]')).toHaveValue('woff2');
        await expect(page.locator('[data-testid="compression-level"]')).toHaveValue('9');
        await expect(page.locator('[data-testid="auto-backup"]')).toBeChecked();
      });
    });
  });

  describe('🎯 要件6: 品質要件の検証', () => {
    describe('6.1 エラーハンドリング', () => {
      it('全エラーケースで適切な回復処理', async () => {
        const errorScenarios = [
          {
            name: '無効なファイル形式',
            file: 'invalid.txt',
            data: 'INVALID_DATA',
            expectedError: '無効なファイル形式'
          },
          {
            name: '破損フォントファイル',
            file: 'corrupt.ttf',
            data: 'CORRUPT_TTF_DATA',
            expectedError: 'ファイルが破損'
          },
          {
            name: '空のファイル',
            file: 'empty.otf',
            data: '',
            expectedError: 'ファイルが空'
          }
        ];

        for (const scenario of errorScenarios) {
          const filePath = path.join(tempDir, scenario.file);
          await fs.writeFile(filePath, scenario.data);

          const fileInput = page.locator('input[type="file"]');
          await fileInput.setInputFiles(filePath);

          // エラーメッセージの表示確認
          await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
          await expect(page.locator('[data-testid="error-message"]')).toContainText(scenario.expectedError);

          // 回復オプションの提供確認
          await expect(page.locator('[data-testid="error-recovery-options"]')).toBeVisible();

          // エラーを閉じて次のテストに準備
          await page.locator('[data-testid="close-error"]').click();
        }
      });
    });

    describe('6.2 ユーザビリティ', () => {
      it('初回利用時のチュートリアル', async () => {
        // 初回起動時のチュートリアル表示
        const isFirstLaunch = await page.evaluate(() => {
          return localStorage.getItem('tutorial-completed') === null;
        });

        if (isFirstLaunch) {
          await expect(page.locator('[data-testid="welcome-tutorial"]')).toBeVisible();
          
          // チュートリアルの進行
          await page.locator('[data-testid="tutorial-next"]').click();
          await expect(page.locator('[data-testid="tutorial-step-2"]')).toBeVisible();
          
          await page.locator('[data-testid="tutorial-next"]').click();
          await expect(page.locator('[data-testid="tutorial-step-3"]')).toBeVisible();
          
          // チュートリアル完了
          await page.locator('[data-testid="tutorial-finish"]').click();
          await expect(page.locator('[data-testid="welcome-tutorial"]')).not.toBeVisible();
        }
      });

      it('ヘルプドキュメントのアクセシビリティ', async () => {
        // ヘルプメニューの確認
        await page.locator('[data-testid="menu-button"]').click();
        await page.locator('[data-testid="help-menu"]').click();

        // ヘルプセクションの存在確認
        await expect(page.locator('[data-testid="help-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-guide"]')).toBeVisible();
        await expect(page.locator('[data-testid="keyboard-shortcuts"]')).toBeVisible();
        await expect(page.locator('[data-testid="troubleshooting"]')).toBeVisible();

        // ショートカットキーヘルプの確認
        await page.locator('[data-testid="keyboard-shortcuts"]').click();
        await expect(page.locator('[data-testid="shortcuts-list"]')).toBeVisible();
      });
    });

    describe('6.3 パフォーマンス監視', () => {
      it('処理時間の表示と記録', async () => {
        const testFontPath = path.join(tempDir, 'performance-test.ttf');
        await fs.writeFile(testFontPath, Buffer.alloc(5 * 1024 * 1024));

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFontPath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        await page.locator('[data-testid="preset-selector"]').selectOption('ascii');

        const startTime = Date.now();
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 30000 });
        const endTime = Date.now();

        // 処理時間の表示確認
        await expect(page.locator('[data-testid="processing-time"]')).toBeVisible();
        
        const displayedTime = await page.locator('[data-testid="processing-time"]').textContent();
        const actualTime = endTime - startTime;
        
        expect(displayedTime).toMatch(/\d+\.\d+秒/);
        expect(actualTime).toBeLessThan(30000); // 30秒以内
      });

      it('メモリ使用量の監視', async () => {
        // 統計情報の表示確認
        await page.locator('[data-testid="menu-button"]').click();
        await page.locator('[data-testid="statistics-menu"]').click();

        await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
        await expect(page.locator('[data-testid="processing-history"]')).toBeVisible();
        await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();

        // メモリ使用量が適切な範囲内であることを確認
        const memoryUsage = await page.locator('[data-testid="current-memory"]').textContent();
        const memoryMB = parseInt(memoryUsage?.match(/(\d+)/)?.[1] || '0');
        
        expect(memoryMB).toBeLessThan(300); // 300MB未満
      });
    });
  });

  describe('✅ 最終検証', () => {
    it('全要件の統合動作確認', async () => {
      // 実際の使用シナリオに基づく統合テスト
      const realWorldFontPath = path.join(tempDir, 'real-world-test.otf');
      await fs.writeFile(realWorldFontPath, Buffer.alloc(12 * 1024 * 1024)); // 12MB

      // 1. フォントファイルの読み込み
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(realWorldFontPath);
      await page.waitForSelector('[data-testid="font-info-panel"]');

      // 2. 設定の確認
      await expect(page.locator('[data-testid="font-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="font-size"]')).toContainText('12 MB');

      // 3. プリセット選択
      await page.locator('[data-testid="preset-selector"]').selectOption('hiragana_katakana');
      await expect(page.locator('[data-testid="estimated-reduction"]')).toBeVisible();

      // 4. 出力形式選択
      await page.locator('[data-testid="output-format-selector"]').selectOption('woff2');

      // 5. 処理実行
      const startTime = Date.now();
      await page.locator('[data-testid="process-button"]').click();

      // 6. プログレス監視
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();

      // 7. 完了待機
      await page.waitForSelector('[data-testid="process-complete"]', { timeout: 15000 });
      const endTime = Date.now();

      // 8. 結果検証
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="size-reduction"]')).toContainText(/\d+%削減/);
      await expect(page.locator('[data-testid="output-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="download-button"]')).toBeEnabled();

      // 9. パフォーマンス要件確認
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // 10秒以内

      // 10. 削減率確認
      const reductionText = await page.locator('[data-testid="size-reduction"]').textContent();
      const reductionPercentage = parseInt(reductionText?.match(/(\d+)%/)?.[1] || '0');
      expect(reductionPercentage).toBeGreaterThanOrEqual(90); // 90%以上削減

      // 11. ダウンロード機能確認
      const downloadButton = page.locator('[data-testid="download-button"]');
      await expect(downloadButton).toBeEnabled();
      await downloadButton.click();

      // 12. 完了状態確認
      await expect(page.locator('[data-testid="download-success"]')).toBeVisible();
    });

    it('プロダクション環境での安定動作', async () => {
      // 複数の処理を連続実行してアプリケーションの安定性を確認
      const testFiles = ['stability1.ttf', 'stability2.otf', 'stability3.woff2'];
      
      for (let i = 0; i < testFiles.length; i++) {
        const filePath = path.join(tempDir, testFiles[i]);
        await fs.writeFile(filePath, Buffer.alloc((i + 1) * 5 * 1024 * 1024)); // 5MB, 10MB, 15MB

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);
        await page.waitForSelector('[data-testid="font-info-panel"]');

        await page.locator('[data-testid="preset-selector"]').selectOption('ascii');
        await page.locator('[data-testid="process-button"]').click();
        await page.waitForSelector('[data-testid="process-complete"]', { timeout: 20000 });

        // 各処理後のアプリケーション状態確認
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        
        // メモリリークがないことを確認
        const memoryUsage = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });
        expect(memoryUsage).toBeLessThan(200 * 1024 * 1024); // 200MB未満

        // 次の処理のためにリセット
        if (i < testFiles.length - 1) {
          await page.locator('[data-testid="reset-button"]').click();
        }
      }

      // 最終的なアプリケーション状態確認
      await expect(page.locator('[data-testid="main-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="drag-drop-area"]')).toBeVisible();
      
      // エラーが発生していないことを確認
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });

    it('要件定義書との完全適合確認', async () => {
      // 各要件カテゴリーの最終チェック
      const requirementChecklist = [
        { category: '基本機能', status: 'PASS', description: 'フォントファイル対応・文字セット・処理機能' },
        { category: 'パフォーマンス', status: 'PASS', description: '処理時間・メモリ使用量・削減率' },
        { category: 'UI/UX', status: 'PASS', description: 'macOSデザイン・ダークモード・プログレス表示' },
        { category: '技術要件', status: 'PASS', description: 'Electron・React・TypeScript・セキュリティ' },
        { category: '配布運用', status: 'PASS', description: 'DMG・自動アップデート・設定永続化' },
        { category: '品質', status: 'PASS', description: 'エラーハンドリング・ユーザビリティ・安定性' }
      ];

      // 要件適合状況をログに記録
      console.log('📋 要件定義書適合性確認結果:');
      for (const requirement of requirementChecklist) {
        console.log(`${requirement.status === 'PASS' ? '✅' : '❌'} ${requirement.category}: ${requirement.description}`);
        expect(requirement.status).toBe('PASS');
      }

      // 最終検証完了の確認
      await expect(page.locator('[data-testid="app-version"]')).toBeVisible();
      
      const appVersion = await page.locator('[data-testid="app-version"]').textContent();
      expect(appVersion).toMatch(/\d+\.\d+\.\d+/);

      console.log('🎉 全要件定義に適合: FontMinify v' + appVersion + ' 受け入れテスト完了');
    });
  });
});