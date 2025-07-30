// FontMinify アイコン生成スクリプト
// 注意: このスクリプトを実行するには `npm install canvas` が必要です

const fs = require('fs');
const path = require('path');

console.log('FontMinify PNG アイコン生成スクリプト');
console.log('=====================================');

// アイコンサイズ定義
const iconSizes = [16, 32, 48, 64, 128, 256, 512, 1024];
const iconsDir = path.join(__dirname, '../assets/icons');

// ディレクトリ作成
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// プレースホルダーアイコン生成関数（SVGベース）
function generateSVGIcon(size) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="${size * 0.008}" stdDeviation="${size * 0.016}" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <!-- 背景円 -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - size * 0.04}" fill="url(#primaryGradient)" filter="url(#dropshadow)"/>
  
  <!-- メインコンテンツ -->
  <g transform="translate(${size/2}, ${size/2})">
    <!-- フォント文字「あ」のシンプル化 -->
    <text x="${-size * 0.08}" y="${size * 0.08}" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="${size * 0.25}" 
          font-weight="600" 
          fill="white" 
          text-anchor="middle" 
          dominant-baseline="middle">あ</text>
    
    <!-- 最適化矢印 -->
    <g transform="translate(${size * 0.15}, ${-size * 0.08})">
      <path d="M${-size * 0.03},${-size * 0.04} L${size * 0.03},${-size * 0.04} L${size * 0.03},${-size * 0.02} L${size * 0.05},0 L0,${size * 0.05} L${-size * 0.05},0 L${-size * 0.03},${-size * 0.02} Z" 
            fill="white" opacity="0.8"/>
      <circle cx="0" cy="${size * 0.07}" r="${size * 0.006}" fill="white" opacity="0.6"/>
      <circle cx="0" cy="${size * 0.09}" r="${size * 0.004}" fill="white" opacity="0.4"/>
    </g>
  </g>
</svg>`;
  
  return svg;
}

// SVGファイル生成
iconSizes.forEach(size => {
  const svg = generateSVGIcon(size);
  const svgPath = path.join(iconsDir, `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ icon-${size}.svg を生成しました`);
});

// メインのSVGファイルも更新
const mainSvg = generateSVGIcon(512);
const mainSvgPath = path.join(iconsDir, 'icon.svg');
fs.writeFileSync(mainSvgPath, mainSvg);
console.log('✓ icon.svg を更新しました');

console.log('');
console.log('次のステップ:');
console.log('1. SVGファイルをPNGに変換（オンライン変換ツールまたはcanvasライブラリ使用）');
console.log('2. 以下のコマンドでicnsファイルを作成:');
console.log('   mkdir icon.iconset');
iconSizes.slice(0, 6).forEach(size => {
  console.log(`   cp icon-${size}.png icon.iconset/icon_${size}x${size}.png`);
  if (size <= 512) {
    console.log(`   cp icon-${size * 2}.png icon.iconset/icon_${size}x${size}@2x.png`);
  }
});
console.log('   iconutil -c icns icon.iconset');
console.log('');
console.log('または、以下のオンラインサービスを使用:');
console.log('- https://cloudconvert.com/svg-to-png');
console.log('- https://iconverticons.com/online/');

// package.json設定のサンプル出力
console.log('');
console.log('package.json に追加する build 設定:');
console.log(JSON.stringify({
  "build": {
    "appId": "com.fontminify.app",
    "productName": "FontMinify",
    "directories": {
      "output": "dist"
    },
    "files": [
      "dist-electron/**/*",
      "dist/**/*",
      "assets/icons/**/*"
    ],
    "mac": {
      "icon": "assets/icons/icon.icns",
      "category": "public.app-category.developer-tools",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ]
    }
  }
}, null, 2));