const fs = require('fs');
const path = require('path');

console.log('FontMinify DMG作成スクリプト');
console.log('============================');

// DMG作成のための前提条件をチェック
function checkPrerequisites() {
  const errors = [];
  const warnings = [];
  
  // アイコンファイルの存在確認
  const icnsPath = path.join(__dirname, '../assets/icons/icon.icns');
  const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
  if (!fs.existsSync(icnsPath) && !fs.existsSync(svgPath)) {
    errors.push(`アイコンファイルが見つかりません: ${icnsPath} または ${svgPath}`);
  }
  
  // DMG背景画像の確認
  const dmgBackgroundPath = path.join(__dirname, '../build/dmg-background.png');
  if (!fs.existsSync(dmgBackgroundPath)) {
    warnings.push(`DMG背景画像が見つかりません: ${dmgBackgroundPath}`);
    warnings.push('SVGから変換するか、デフォルト背景を使用します');
  }
  
  // ビルド出力ディレクトリの確認
  const distPath = path.join(__dirname, '../dist');
  if (!fs.existsSync(distPath)) {
    errors.push(`ビルド出力が見つかりません: ${distPath}`);
    errors.push('npm run build を実行してください');
  }
  
  // entitlementsファイルの確認
  const entitlementsPath = path.join(__dirname, '../build/entitlements.mac.plist');
  if (!fs.existsSync(entitlementsPath)) {
    warnings.push(`Entitlementsファイルが見つかりません: ${entitlementsPath}`);
  }
  
  return { errors, warnings };
}

// DMGビルドコマンドの生成
function generateBuildCommands() {
  const commands = [
    'echo "FontMinify DMGビルドプロセス開始"',
    'echo "================================="',
    '',
    '# 1. クリーンビルド',
    'echo "📦 アプリケーションをビルド中..."',
    'npm run build',
    '',
    '# 2. electron-builderでDMG作成',
    'echo "🔨 DMGファイルを作成中..."',
    'npm run dist:mac',
    '',
    '# 3. 結果の確認',
    'echo "✅ ビルド完了!"',
    'echo "出力先: $(ls -la dist/*.dmg 2>/dev/null || echo "DMGファイルが見つかりません")"',
    '',
    '# 4. DMGファイルの検証',
    'if [ -f dist/*.dmg ]; then',
    '  echo "📁 DMGファイル情報:"',
    '  hdiutil imageinfo dist/*.dmg | grep -E "(Format|Size|Compressed)"',
    'else',
    '  echo "❌ DMGファイルの作成に失敗しました"',
    '  exit 1',
    'fi'
  ];
  
  return commands.join('\n');
}

// メイン処理
function main() {
  console.log('前提条件をチェック中...\n');
  
  const { errors, warnings } = checkPrerequisites();
  
  // エラーの表示
  if (errors.length > 0) {
    console.log('❌ エラー:');
    errors.forEach(error => console.log(`   ${error}`));
    console.log('');
  }
  
  // 警告の表示
  if (warnings.length > 0) {
    console.log('⚠️  警告:');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('エラーを修正してから再実行してください。');
    return;
  }
  
  // ビルドスクリプトの生成
  const buildScript = generateBuildCommands();
  const scriptPath = path.join(__dirname, '../build-dmg.sh');
  
  fs.writeFileSync(scriptPath, buildScript);
  
  console.log('✓ DMGビルドスクリプトを生成しました');
  console.log(`  スクリプト: ${scriptPath}`);
  console.log('');
  console.log('実行方法:');
  console.log('  chmod +x build-dmg.sh');
  console.log('  ./build-dmg.sh');
  console.log('');
  console.log('または直接:');
  console.log('  npm run dist:mac');
  
  // パッケージの設定確認
  console.log('');
  console.log('現在のelectron-builder設定:');
  
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.build) {
    console.log('  ✓ build設定: あり');
    console.log(`  ✓ appId: ${packageJson.build.appId}`);
    console.log(`  ✓ productName: ${packageJson.build.productName}`);
    
    if (packageJson.build.mac) {
      console.log('  ✓ macOS設定: あり');
      console.log(`    - カテゴリ: ${packageJson.build.mac.category}`);
      console.log(`    - アイコン: ${packageJson.build.mac.icon}`);
    }
    
    if (packageJson.build.dmg) {
      console.log('  ✓ DMG設定: あり');
      console.log(`    - タイトル: ${packageJson.build.dmg.title}`);
      console.log(`    - 背景画像: ${packageJson.build.dmg.background || 'デフォルト'}`);
    }
  } else {
    console.log('  ❌ build設定が見つかりません');
  }
}

main();