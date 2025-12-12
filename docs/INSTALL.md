# FontMinify インストールガイド

FontMinifyをmacOSにインストールする方法を説明します。

## ダウンロード

[Releases](https://github.com/your-username/fontminify/releases)ページから最新のDMGファイルをダウンロードしてください。

## インストール手順

1. ダウンロードした`FontMinify-x.x.x.dmg`をダブルクリックしてマウント
2. 開いたウィンドウで`FontMinify.app`を`Applications`フォルダにドラッグ
3. DMGをアンマウント（取り出し）

## 初回起動時の注意

FontMinifyは現在Apple Developer Programによる署名・公証を行っていないため、初回起動時にmacOSのセキュリティ警告が表示されます。

### ターミナルで属性を削除

1. **ターミナル**を開く（Spotlight検索で「ターミナル」と入力）
2. 以下のコマンドを実行:

```bash
xattr -dr com.apple.quarantine /Applications/FontMinify.app
```

3. FontMinify.appをダブルクリックで起動

## アンインストール

1. Finderで`Applications`フォルダを開く
2. `FontMinify.app`をゴミ箱にドラッグ
3. ゴミ箱を空にする

### 設定ファイルの削除（任意）

アプリの設定も完全に削除したい場合:

```bash
rm -rf ~/Library/Application\ Support/FontMinify
rm -rf ~/Library/Preferences/com.fontminify.app.plist
```

## 動作環境

- **OS**: macOS Big Sur (11.0) 以上
- **CPU**: Intel / Apple Silicon 両対応（Universal Binary）
- **メモリ**: 4GB以上推奨
- **ディスク**: 100MB以上の空き容量

## トラブルシューティング

### 「壊れているため開けません」と表示される

quarantine属性が原因です。上記のターミナルコマンドを実行してください:

```bash
xattr -dr com.apple.quarantine /Applications/FontMinify.app
```

### アプリが起動しない

1. macOSのバージョンが11.0以上か確認
2. アクティビティモニタでFontMinifyプロセスが残っていないか確認
3. アプリを再インストール

### フォントの読み込みに失敗する

- 対応フォーマット: TTF, OTF, WOFF, WOFF2
- ファイルが破損していないか確認
- ファイルサイズが極端に大きくないか確認（推奨: 100MB以下）

## サポート

問題が解決しない場合は、[GitHub Issues](https://github.com/your-username/fontminify/issues)で報告してください。
