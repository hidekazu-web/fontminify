# FontMinify

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-37.2-brightgreen.svg)](https://www.electronjs.org/)

日本語フォントの軽量化を簡単に行えるツールです。フォントのサブセット化により、ファイルサイズを90%以上削減できます。

- **デスクトップ版**: macOS向けElectronアプリケーション
- **Web版**: ブラウザで動作する完全クライアントサイド処理（サーバー送信なし）

## 🎯 主な機能

- **ドラッグ&ドロップ対応**: フォントファイルを簡単に読み込み
- **複数プリセット**: 日本語用に最適化された文字セット
- **カスタム文字セット**: 独自の文字セットを指定可能
- **高い圧縮率**: WOFF2形式で90%以上のサイズ削減
- **リアルタイム進捗**: 処理状況をリアルタイムで表示
- **ダークモード**: システム設定に連動

## 🌐 Web版

### 特徴
- **完全クライアントサイド処理**: フォントデータがサーバーに送信されることはありません
- **WebAssembly**: HarfBuzz WASMを使用した高速サブセット化
- **バリアブルフォント対応**: 軸の固定（ピン）機能をサポート
- **即時ダウンロード**: 処理完了後すぐにダウンロード可能

### 対応ブラウザ
- Chrome 89+
- Firefox 89+
- Safari 15+
- Edge 89+

### 開発用コマンド（Web版）

```bash
# Web版開発サーバー起動
npm run dev:web

# Web版ビルド
npm run build:web

# Web版プレビュー
npm run preview:web

# Web版E2Eテスト
npm run test:e2e:web
```

### デプロイ

Web版はVercelやGitHub Pagesにデプロイ可能です。
- Vercel: `vercel.json` で設定済み（COOP/COEPヘッダー、WASMキャッシュ対応）
- GitHub Actions: `.github/workflows/deploy-web.yml` で自動ビルド

## 📦 対応フォーマット

### 入力フォーマット
- TTF (TrueType Font)
- OTF (OpenType Font)
- WOFF (Web Open Font Format)
- WOFF2 (Web Open Font Format 2.0)

### 出力フォーマット
- WOFF2 (推奨・最高圧縮率)
- WOFF
- TTF
- OTF

## 🚀 文字セットプリセット

| プリセット | 文字数 | 内容 |
|------------|--------|------|
| ひらがな・カタカナ | 146文字 | ひらがな・カタカナのみ |
| ASCII文字 | 95文字 | 英数字・記号のみ |
| JLPT N5漢字 | 341文字 | 最も基本的な漢字レベル |
| JLPT N4漢字 | 541文字 | N5 + N4レベルの漢字 |
| JLPT N3漢字 | 891文字 | N5-N3レベルの漢字 |
| 常用漢字 | 1,291文字 | 小中学校で学ぶ漢字 |

## 🛠 開発環境のセットアップ

### 必要な環境
- Node.js 18.0以上
- npm 8.0以上
- macOS Big Sur (11.0) 以上

### インストール手順

```bash
# リポジトリのクローン
git clone https://github.com/your-username/fontminify.git
cd fontminify

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 開発用コマンド

```bash
# 開発モード（ホットリロード付き）
npm run dev

# プロダクションビルド
npm run build

# 型チェック
npm run typecheck

# リンティング
npm run lint

# テスト実行
npm test
npm run test:unit       # 単体テストのみ
npm run test:e2e        # E2Eテストのみ

# macOS用パッケージング
npm run dist:mac        # DMGインストーラーを作成
```

## 🏗 アーキテクチャ

### プロセス構成
```
FontMinify App
├── Main Process (Electron)
│   ├── Font Analysis (fontkit)
│   ├── Font Subsetting (subset-font)
│   ├── WOFF2 Compression
│   └── File Management
├── Renderer Process (React + TypeScript)
│   ├── UI Components
│   ├── State Management (Zustand)
│   └── Error Handling
└── IPC Communication
    ├── Type-safe Channels
    └── Progress Updates
```

### 主要技術スタック
- **フレームワーク**: Electron 37.2
- **UI**: React 18 + TypeScript 5.3
- **スタイリング**: Tailwind CSS 3.4
- **状態管理**: Zustand 4.4
- **ビルドツール**: Vite 5.0
- **テスト**: Vitest + Playwright
- **フォント処理**: fontkit + subset-font

## 📱 使用方法

1. **アプリケーションの起動**
   - FontMinifyを起動

2. **フォントファイルの選択**
   - フォントファイルをドラッグ&ドロップ
   - または「ファイルを選択」ボタンをクリック

3. **文字セットの選択**
   - プリセットから選択
   - またはカスタム文字セットを入力

4. **処理の実行**
   - 「サブセット化実行」ボタンをクリック
   - 進行状況をリアルタイムで確認

5. **結果の保存**
   - 処理完了後、保存先を指定

## 🔒 セキュリティ

- **コンテキスト分離**: メインプロセスとレンダラープロセスの完全分離
- **CSP (Content Security Policy)**: 適切なセキュリティヘッダー設定
- **Node統合無効化**: レンダラープロセスでのNode.js API無効化
- **入力検証**: 全てのファイル操作とIPC通信の検証

## 📊 パフォーマンス目標

- **処理速度**: 10MBフォント処理 < 10秒
- **メモリ使用量**: 最大300MB以下
- **UI応答性**: 60fps維持（ドラッグ&ドロップ中）
- **圧縮率**: 90%以上のサイズ削減（WOFF2使用時）

## 🧪 テスト

### テスト種類
- **単体テスト**: 個別機能のテスト (Vitest)
- **統合テスト**: IPC通信とフォント処理のテスト
- **E2Eテスト**: 完全なユーザーワークフローのテスト (Playwright)

### テスト実行
```bash
# 全テスト実行（単体テスト）
npm test

# 単体テストのみ（verbose出力）
npm run test:unit

# デスクトップ版E2Eテストのみ
npm run test:e2e

# Web版E2Eテストのみ
npm run test:e2e:web

# Web版単体テストのみ
npm test -- --run tests/web/
```

## 📋 ロードマップ

### v1.2 (現在)
- ✅ 基本的なフォントサブセット化
- ✅ プリセット文字セット
- ✅ WOFF2圧縮
- ✅ プログレス表示
- ✅ エラーハンドリング
- ✅ バリアブルフォント対応（軸検出・固定）
- ✅ E2Eテスト実装
- ✅ macOS配布準備
- ✅ **Web版対応** (NEW)
  - HarfBuzz WASMによるサブセット化
  - クライアントサイド完全処理
  - バリアブルフォント軸固定対応

### v1.3 (予定)
- カラー絵文字フォント対応
- バッチ処理機能強化
- Windows対応

### v2.0 (予定)
- クラウド処理対応
- API提供
- コラボレーション機能

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [fontkit](https://github.com/foliojs/fontkit) - フォント解析ライブラリ
- [subset-font](https://github.com/papandreou/subset-font) - フォントサブセット化ライブラリ（デスクトップ版）
- [harfbuzzjs](https://www.npmjs.com/package/harfbuzzjs) - HarfBuzz WASMラッパー（Web版）
- [woff2-encoder](https://www.npmjs.com/package/woff2-encoder) - WOFF2圧縮
- [Electron](https://www.electronjs.org/) - クロスプラットフォームデスクトップアプリ開発
- [React](https://reactjs.org/) - UIライブラリ
- [TypeScript](https://www.typescriptlang.org/) - 型安全なJavaScript

## 📞 サポート

- **Issue報告**: [GitHub Issues](https://github.com/your-username/fontminify/issues)
- **機能要望**: [GitHub Discussions](https://github.com/your-username/fontminify/discussions)
- **セキュリティ**: security@fontminify.app

---

<div align="center">
  Made with ❤️ for Japanese Typography
</div>