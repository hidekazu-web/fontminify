# FontMinify インストールガイド

FontMinifyをmacOSにインストールする方法を説明します。

## ダウンロード

[Releases](https://github.com/your-username/fontminify/releases)ページから最新のDMGファイルをダウンロードしてください。

## インストール手順

1. ダウンロードした`FontMinify-x.x.x.dmg`をダブルクリックしてマウント
2. 開いたウィンドウで`FontMinify.app`を`Applications`フォルダにドラッグ
3. DMGをアンマウント（取り出し）

## 初回起動時の注意

FontMinifyは現在Apple Developer Programによる署名・公証を行っていないため、初回起動時にmacOSのセキュリティ警告が表示されます。以下のいずれかの方法で起動できます。

---

### 方法1: 右クリックで開く（macOS Sonoma 14以前）

1. Finderで`Applications`フォルダを開く
2. **FontMinify.appを右クリック**（またはControl+クリック）
3. メニューから**「開く」**を選択
4. 警告ダイアログが表示されたら**「開く」**をクリック

> **注意**: macOS Sequoia (15) 以降ではこの方法は使用できません。方法2を使用してください。

---

### 方法2: システム設定から許可（推奨・全バージョン対応）

macOS Sequoia / Sonoma / Ventura 共通の方法です。

1. FontMinify.appをダブルクリック（警告が表示される）
2. **システム設定**を開く
3. **プライバシーとセキュリティ**をクリック
4. 下にスクロールして「FontMinifyは開発元を確認できないため...」というメッセージを探す
5. **「このまま開く」**をクリック
6. パスワードを入力して許可

> 2回目以降は通常のダブルクリックで起動できます。

---

### 方法3: ターミナルで属性を削除（上級者向け）

上記の方法で解決しない場合、ターミナルを使用します。

1. **ターミナル**を開く（Spotlight検索で「ターミナル」と入力）
2. 以下のコマンドを実行:

```bash
xattr -dr com.apple.quarantine /Applications/FontMinify.app
```

3. FontMinify.appをダブルクリックで起動

---

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

quarantine属性が原因です。方法3のターミナルコマンドを実行してください:

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
