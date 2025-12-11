# FontMinify Docker Environment

FontMinifyアプリケーションを安全なDockerコンテナ環境でテスト・開発するためのセットアップです。

## 🐳 概要

- **安全性**: ホストシステムから分離された環境での実行
- **再現性**: 一貫した開発・テスト環境
- **GUI対応**: XvfbとVNCを使用したヘッドレスGUI環境
- **簡単操作**: シンプルなコマンドで操作可能

## 📋 前提条件

- Docker Desktop for Mac がインストールされていること
- Docker Compose が利用可能であること

## 🚀 クイックスタート

### 1. 開発環境の起動

```bash
# 開発環境を起動
./scripts/docker-dev.sh start

# コンテナ内でシェルを開く
./scripts/docker-dev.sh shell
```

### 2. テストの実行

```bash
# 全てのテストを実行
./scripts/docker-test.sh all

# 単体テストのみ
./scripts/docker-test.sh test

# E2Eテストのみ
./scripts/docker-test.sh e2e
```

## 🛠 使用可能なコマンド

### 開発環境管理 (`docker-dev.sh`)

```bash
./scripts/docker-dev.sh [COMMAND]
```

**コンテナ管理:**
- `start` - 開発コンテナ起動
- `stop` - 開発コンテナ停止
- `restart` - 開発コンテナ再起動
- `status` - コンテナ状態確認
- `logs` - コンテナログ表示
- `shell` - コンテナ内シェル起動

**開発作業:**
- `install` - 依存関係インストール
- `build-app` - アプリケーションビルド
- `lint` - リンター実行
- `typecheck` - 型チェック実行

**テスト:**
- `test-unit` - 単体テスト実行
- `test-e2e` - E2Eテスト実行

**メンテナンス:**
- `clean` - 環境クリーンアップ
- `rebuild` - 環境再構築

### テスト実行 (`docker-test.sh`)

```bash
./scripts/docker-test.sh [COMMAND]
```

- `build` - Dockerイメージビルド
- `test` - 単体テスト実行
- `e2e` - E2Eテスト実行
- `all` - 全テスト実行
- `dev` - 開発環境起動
- `shell` - インタラクティブシェル
- `clean` - リソースクリーンアップ

## 🖥 GUI アクセス

ElectronアプリのGUIを確認したい場合:

1. VNCクライアントをインストール（例：RealVNC Viewer）
2. `localhost:5900` に接続
3. パスワードは不要

## 📁 ディレクトリ構造

Docker環境では以下のディレクトリがマウントされます:

```
/app/              # アプリケーションルート
/app/test-fonts/   # テスト用フォントファイル（tests/fixtures/fontsからマウント）
/app/test-output/  # 出力ファイル
```

## 🔧 環境設定

### 環境変数

- `DISPLAY=:99` - X11ディスプレイ
- `NODE_ENV=development` - Node.js環境
- `ELECTRON_DISABLE_SECURITY_WARNINGS=true` - Electron警告無効化

### ポート

- `5900` - VNC接続用
- `5173` - 開発サーバー（必要時）

## 🐛 トラブルシューティング

### Dockerが起動しない

```bash
# Dockerの状態確認
docker info

# Docker Desktop for Macが起動していることを確認
```

### GUI表示の問題

```bash
# VNC接続を確認
./scripts/docker-dev.sh logs

# Xvfbプロセス確認
./scripts/docker-dev.sh shell
ps aux | grep Xvfb
```

### パーミッションエラー

```bash
# 環境を完全にクリーンアップして再構築
./scripts/docker-dev.sh rebuild
```

## 📝 使用例

### 基本的な開発フロー

```bash
# 1. 環境起動
./scripts/docker-dev.sh start

# 2. 依存関係インストール
./scripts/docker-dev.sh install

# 3. アプリケーションビルド
./scripts/docker-dev.sh build-app

# 4. テスト実行
./scripts/docker-dev.sh test-unit

# 5. 開発完了後のクリーンアップ
./scripts/docker-dev.sh clean
```

### CI/CDでの使用

```bash
# 全てのテストを自動実行
./scripts/docker-test.sh all
```

## ⚠️ 注意事項

- コンテナは非rootユーザー（fontminify）で実行されます
- ホストファイルシステムへの書き込みは制限されています
- GUI操作が必要な場合はVNC接続を使用してください
- テスト用フォントファイルは `tests/fixtures/fonts/` ディレクトリに配置してください

## 🔒 セキュリティ

- コンテナは最小権限で実行
- ホストシステムからの分離
- 非rootユーザーでの実行
- 必要なポートのみ公開