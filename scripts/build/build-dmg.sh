echo "FontMinify DMGビルドプロセス開始"
echo "================================="

# 1. クリーンビルド
echo "📦 アプリケーションをビルド中..."
npm run build

# 2. electron-builderでDMG作成
echo "🔨 DMGファイルを作成中..."
npm run dist:mac

# 3. 結果の確認
echo "✅ ビルド完了!"
echo "出力先: $(ls -la dist/*.dmg 2>/dev/null || echo "DMGファイルが見つかりません")"

# 4. DMGファイルの検証
if [ -f dist/*.dmg ]; then
  echo "📁 DMGファイル情報:"
  hdiutil imageinfo dist/*.dmg | grep -E "(Format|Size|Compressed)"
else
  echo "❌ DMGファイルの作成に失敗しました"
  exit 1
fi