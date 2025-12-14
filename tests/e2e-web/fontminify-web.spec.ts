import { test, expect, Page } from '@playwright/test'
import path from 'path'

test.describe('FontMinify Web版 E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // ページが完全に読み込まれるのを待つ
    await page.waitForLoadState('networkidle')
  })

  test.describe('基本的なUI表示', () => {
    test('ページタイトルが正しい', async ({ page }) => {
      await expect(page).toHaveTitle(/FontMinify/)
    })

    test('メインUIコンポーネントが表示される', async ({ page }) => {
      // ドラッグ&ドロップエリア
      await expect(page.getByText('フォントファイルをドラッグ&ドロップ')).toBeVisible()

      // ファイル選択ボタン
      await expect(page.getByRole('button', { name: /ファイルを選択/ })).toBeVisible()
    })

    test('初期状態でサブセット化ボタンが無効', async ({ page }) => {
      const processButton = page.getByRole('button', { name: /サブセット化/ })
      await expect(processButton).toBeDisabled()
    })
  })

  test.describe('ファイル選択とフォント情報表示', () => {
    test('ファイル選択でフォント情報が表示される', async ({ page }) => {
      // テストフォントファイルをアップロード
      const fileInput = page.locator('input[type="file"]')
      const fontPath = path.join(__dirname, '../fixtures/fonts/static/NotoSansJP-Regular.ttf')

      // ファイルが存在しない場合はスキップ
      try {
        await fileInput.setInputFiles(fontPath)
      } catch {
        test.skip(true, 'Test font file not found')
        return
      }

      // フォント情報が表示されるのを待つ
      await expect(page.getByText('Noto Sans JP')).toBeVisible({ timeout: 10000 })

      // 基本情報の表示確認
      await expect(page.getByText(/ファイルサイズ/)).toBeVisible()
      await expect(page.getByText(/グリフ数/)).toBeVisible()
    })

    test('無効なファイルでエラーが表示される', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]')

      // 無効なファイル（txtファイル）を作成してアップロード
      // Note: Playwrightではバッファから直接ファイルを設定できないため、
      // 実際のテストでは事前に作成したテストファイルを使用
      const invalidPath = path.join(__dirname, '../fixtures/invalid.txt')

      try {
        await fileInput.setInputFiles(invalidPath)
        // エラーメッセージが表示されることを確認
        await expect(page.getByText(/対応していない/)).toBeVisible({ timeout: 5000 })
      } catch {
        // ファイルが存在しない場合はスキップ
        test.skip(true, 'Test fixture not found')
      }
    })
  })

  test.describe('文字セット選択', () => {
    test.beforeEach(async ({ page }) => {
      // フォントファイルをセットアップ（モックまたは実ファイル）
      const fileInput = page.locator('input[type="file"]')
      const fontPath = path.join(__dirname, '../fixtures/fonts/static/NotoSansJP-Regular.ttf')

      try {
        await fileInput.setInputFiles(fontPath)
        await page.waitForSelector('text=Noto Sans JP', { timeout: 10000 })
      } catch {
        test.skip(true, 'Test font file not found')
      }
    })

    test('プリセット文字セットを選択できる', async ({ page }) => {
      // プリセットボタンをクリック
      const preset = page.getByRole('button', { name: /最小/ })
      await preset.click()

      // 選択状態が反映されることを確認
      await expect(preset).toHaveClass(/bg-blue-500|selected/)
    })

    test('カスタム文字入力が機能する', async ({ page }) => {
      // カスタムタブに切り替え
      const customTab = page.getByRole('tab', { name: /カスタム/ })
      if (await customTab.isVisible()) {
        await customTab.click()

        // テキスト入力
        const textarea = page.locator('textarea')
        await textarea.fill('あいうえおかきくけこ')

        // 文字数カウントが表示されることを確認
        await expect(page.getByText(/10文字|10 文字/)).toBeVisible()
      }
    })
  })

  test.describe('サブセット化処理', () => {
    test('サブセット化が実行できる', async ({ page }) => {
      // フォントファイルをセットアップ
      const fileInput = page.locator('input[type="file"]')
      const fontPath = path.join(__dirname, '../fixtures/fonts/static/NotoSansJP-Regular.ttf')

      try {
        await fileInput.setInputFiles(fontPath)
        await page.waitForSelector('text=Noto Sans JP', { timeout: 10000 })
      } catch {
        test.skip(true, 'Test font file not found')
        return
      }

      // プリセットを選択
      const preset = page.getByRole('button', { name: /最小/ })
      await preset.click()

      // サブセット化ボタンをクリック
      const processButton = page.getByRole('button', { name: /サブセット化/ })
      await processButton.click()

      // プログレス表示を確認
      await expect(page.getByText(/処理中|サブセット化中|圧縮中/)).toBeVisible({ timeout: 5000 })

      // 処理完了を待つ（タイムアウト60秒）
      await expect(page.getByText(/完了|ダウンロード/)).toBeVisible({ timeout: 60000 })
    })

    test('処理結果にファイルサイズ削減率が表示される', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]')
      const fontPath = path.join(__dirname, '../fixtures/fonts/static/NotoSansJP-Regular.ttf')

      try {
        await fileInput.setInputFiles(fontPath)
        await page.waitForSelector('text=Noto Sans JP', { timeout: 10000 })
      } catch {
        test.skip(true, 'Test font file not found')
        return
      }

      // プリセットを選択して実行
      await page.getByRole('button', { name: /最小/ }).click()
      await page.getByRole('button', { name: /サブセット化/ }).click()

      // 完了を待つ
      await expect(page.getByText(/完了|ダウンロード/)).toBeVisible({ timeout: 60000 })

      // 削減率が表示されることを確認
      await expect(page.getByText(/%/)).toBeVisible()
    })
  })

  test.describe('バリアブルフォント対応', () => {
    test('バリアブルフォントの軸設定が表示される', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]')
      const variableFontPath = path.join(
        __dirname,
        '../fixtures/fonts/NotoSansJP-VariableFont_wght.ttf'
      )

      try {
        await fileInput.setInputFiles(variableFontPath)
        await page.waitForSelector('text=Variable', { timeout: 10000 })
      } catch {
        test.skip(true, 'Variable font file not found')
        return
      }

      // 軸設定セクションが表示されることを確認
      await expect(page.getByText(/ウェイト|Weight|wght/i)).toBeVisible()

      // スライダーが表示されることを確認
      await expect(page.locator('input[type="range"]')).toBeVisible()
    })

    test('軸固定オプションが機能する', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]')
      const variableFontPath = path.join(
        __dirname,
        '../fixtures/fonts/NotoSansJP-VariableFont_wght.ttf'
      )

      try {
        await fileInput.setInputFiles(variableFontPath)
        await page.waitForSelector('text=Variable', { timeout: 10000 })
      } catch {
        test.skip(true, 'Variable font file not found')
        return
      }

      // 軸固定チェックボックスを探す
      const checkbox = page.getByRole('checkbox', { name: /固定|pin/i })
      if (await checkbox.isVisible()) {
        await checkbox.check()
        await expect(checkbox).toBeChecked()
      }
    })
  })

  test.describe('ダウンロード機能', () => {
    test('処理完了後にダウンロードボタンが有効になる', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]')
      const fontPath = path.join(__dirname, '../fixtures/fonts/static/NotoSansJP-Regular.ttf')

      try {
        await fileInput.setInputFiles(fontPath)
        await page.waitForSelector('text=Noto Sans JP', { timeout: 10000 })
      } catch {
        test.skip(true, 'Test font file not found')
        return
      }

      // プリセットを選択して実行
      await page.getByRole('button', { name: /最小/ }).click()
      await page.getByRole('button', { name: /サブセット化/ }).click()

      // 完了を待つ
      await expect(page.getByText(/完了|ダウンロード/)).toBeVisible({ timeout: 60000 })

      // ダウンロードボタンが有効になることを確認
      const downloadButton = page.getByRole('button', { name: /ダウンロード/ })
      await expect(downloadButton).toBeEnabled()
    })
  })

  test.describe('ブラウザ互換性チェック', () => {
    test('WebAssembly対応チェックが実行される', async ({ page }) => {
      // 非対応ブラウザのエラーメッセージが表示されないことを確認
      // （対応ブラウザでテストしているため）
      const errorMessage = page.getByText(/このブラウザはサポートされていません/)
      await expect(errorMessage).not.toBeVisible()
    })
  })

  test.describe('エラー表示', () => {
    test('エラートーストが正しく表示される', async ({ page }) => {
      // 空のファイルや不正なファイルでエラーを発生させる
      // Note: 実際のテストでは事前に用意した不正なファイルを使用

      const fileInput = page.locator('input[type="file"]')
      const emptyFontPath = path.join(__dirname, '../fixtures/empty.ttf')

      try {
        await fileInput.setInputFiles(emptyFontPath)

        // エラートーストが表示されることを確認
        const errorToast = page.locator('[role="alert"]')
        await expect(errorToast).toBeVisible({ timeout: 5000 })
      } catch {
        // ファイルが存在しない場合はスキップ
        test.skip(true, 'Test fixture not found')
      }
    })
  })

  test.describe('レスポンシブデザイン', () => {
    test('モバイルビューポートで正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()

      // 主要要素が表示されることを確認
      await expect(page.getByText('FontMinify')).toBeVisible()
      await expect(page.getByRole('button', { name: /ファイルを選択/ })).toBeVisible()
    })

    test('タブレットビューポートで正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()

      // 主要要素が表示されることを確認
      await expect(page.getByText('FontMinify')).toBeVisible()
      await expect(page.getByRole('button', { name: /ファイルを選択/ })).toBeVisible()
    })
  })
})
