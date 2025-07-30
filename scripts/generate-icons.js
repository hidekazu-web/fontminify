const fs = require('fs');
const path = require('path');

// 必要なアイコンサイズ（Retina対応）
const iconSizes = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 64, name: 'icon-64.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 256, name: 'icon-256.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 1024, name: 'icon-1024.png' }
];

// SVGをベースにしたPNG生成のメモ
console.log('FontMinify アイコン生成スクリプト');
console.log('=====================================');
console.log('');
console.log('必要なアイコンサイズ:');

iconSizes.forEach(({ size, name }) => {
  console.log(`- ${name} (${size}x${size})`);
});

console.log('');
console.log('生成手順:');
console.log('1. assets/icons/icon.svg をベースに各サイズのPNGを生成');
console.log('2. macOS用 .icns ファイルを作成');
console.log('3. electron-builder の build 設定に追加');
console.log('');
console.log('推奨ツール:');
console.log('- SVG to PNG: https://cloudconvert.com/svg-to-png');
console.log('- ICNS作成: iconutil (macOS標準)');
console.log('- 代替: https://iconverticons.com/online/');

// アイコンディレクトリの確認
const iconsDir = path.join(__dirname, '../assets/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✓ icons ディレクトリを作成しました');
}

// 生成予定ファイルリストの作成
const generateList = () => {
  console.log('');
  console.log('生成予定ファイル:');
  
  iconSizes.forEach(({ size, name }) => {
    const filePath = path.join(iconsDir, name);
    const exists = fs.existsSync(filePath) ? '✓' : '○';
    console.log(`${exists} ${name}`);
  });
  
  const icnsPath = path.join(iconsDir, 'icon.icns');
  const icnsExists = fs.existsSync(icnsPath) ? '✓' : '○';
  console.log(`${icnsExists} icon.icns`);
};

generateList();

// package.json の build 設定例
console.log('');
console.log('electron-builder 設定例:');
console.log(JSON.stringify({
  "build": {
    "appId": "com.fontminify.app",
    "productName": "FontMinify",
    "directories": {
      "output": "dist"
    },
    "mac": {
      "icon": "assets/icons/icon.icns",
      "category": "public.app-category.developer-tools"
    }
  }
}, null, 2));