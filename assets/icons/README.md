# FontMinify アイコン

## 概要
FontMinifyアプリケーション用のRetina対応アイコンファイル群です。

## ファイル構成
```
assets/icons/
├── README.md                    # このファイル
├── icon-spec.md                 # アイコン仕様書
├── icon.svg                     # メインSVGアイコン
├── icon-16.svg ~ icon-1024.svg  # 各サイズ用SVG
├── create-placeholder-icon.html # ブラウザ版アイコンジェネレータ
└── (今後追加予定)
    ├── icon.icns               # macOS用アイコン
    ├── icon-16.png ~ icon-1024.png # PNG版アイコン
    └── icon.iconset/           # icns生成用フォルダ
```

## アイコン生成手順

### 1. SVG生成（完了済み）
```bash
node scripts/generate-png-icons.js
```

### 2. PNG変換
SVGファイルをPNGに変換する方法：

#### A. オンライン変換（推奨）
1. https://cloudconvert.com/svg-to-png にアクセス
2. 各SVGファイル（icon-16.svg ~ icon-1024.svg）をアップロード
3. 対応するPNGファイルをダウンロード
4. `assets/icons/` フォルダに配置

#### B. ローカル変換（Inkscape使用）
```bash
# Inkscapeインストール（Homebrewの場合）
brew install inkscape

# 各サイズ変換
for size in 16 32 48 64 128 256 512 1024; do
  inkscape --export-type=png --export-width=$size --export-height=$size \
    assets/icons/icon-${size}.svg -o assets/icons/icon-${size}.png
done
```

### 3. macOS .icns ファイル作成
```bash
cd assets/icons

# iconsetディレクトリ作成
mkdir icon.iconset

# 必要なサイズをコピー
cp icon-16.png icon.iconset/icon_16x16.png
cp icon-32.png icon.iconset/icon_16x16@2x.png
cp icon-32.png icon.iconset/icon_32x32.png
cp icon-64.png icon.iconset/icon_32x32@2x.png
cp icon-128.png icon.iconset/icon_128x128.png
cp icon-256.png icon.iconset/icon_128x128@2x.png
cp icon-256.png icon.iconset/icon_256x256.png
cp icon-512.png icon.iconset/icon_256x256@2x.png
cp icon-512.png icon.iconset/icon_512x512.png
cp icon-1024.png icon.iconset/icon_512x512@2x.png

# icnsファイル生成
iconutil -c icns icon.iconset

# クリーンアップ
rm -rf icon.iconset
```

### 4. electron-builderでの使用
package.jsonに以下を追加：

```json
{
  "build": {
    "appId": "com.fontminify.app",
    "productName": "FontMinify",
    "mac": {
      "icon": "assets/icons/icon.icns",
      "category": "public.app-category.developer-tools"
    }
  }
}
```

## デザイン仕様
- **ベースサイズ**: 512x512px
- **カラー**: プライマリ（#667eea）からセカンダリ（#764ba2）のグラデーション
- **コンセプト**: 日本語フォント「あ」+ 最適化を表す下向き矢印
- **スタイル**: macOSガイドライン準拠、シンプルで視認性重視

## 今後の改善
1. プロフェッショナルデザイナーによるリファイン
2. ダークモード専用アイコンの検討
3. アニメーション版アイコンの作成（DMGインストーラー用）
4. Windows/Linux用アイコン形式の追加

## 開発メモ
- SVGはプログラマティックに生成されたプレースホルダー
- 実際のリリース時には高品質なデザインに置き換え予定
- フォント最適化ツールとしてのアイデンティティを表現