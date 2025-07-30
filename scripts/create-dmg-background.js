const fs = require('fs');
const path = require('path');

console.log('FontMinify DMG背景画像作成スクリプト');
console.log('=====================================');

// SVGベースのDMG背景画像を作成
function createDMGBackgroundSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="540" height="380" viewBox="0 0 540 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- グラデーション背景 -->
    <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8f9ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8ecff;stop-opacity:1" />
    </linearGradient>
    
    <!-- プライマリグラデーション -->
    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景 -->
  <rect width="540" height="380" fill="url(#backgroundGradient)"/>
  
  <!-- FontMinifyロゴエリア -->
  <g transform="translate(270, 60)">
    <text x="0" y="0" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="24" 
          font-weight="600" 
          fill="url(#primaryGradient)"
          text-anchor="middle">FontMinify</text>
    
    <text x="0" y="25" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="16" 
          fill="#764ba2"
          text-anchor="middle">日本語フォント最適化ツール</text>
  </g>
  
  <!-- アプリケーションアイコン位置 (左側) -->
  <g transform="translate(125, 180)">
    <!-- アプリケーションドロップゾーン -->
    <rect x="-60" y="-60" width="120" height="120" 
          fill="none" 
          stroke="#667eea" 
          stroke-width="2" 
          stroke-dasharray="5,5" 
          rx="10"/>
    
    <!-- アプリアイコンプレースホルダー -->
    <circle cx="0" cy="-20" r="25" fill="url(#primaryGradient)" opacity="0.8"/>
    <text x="0" y="10" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="14" 
          fill="#333"
          text-anchor="middle">FontMinify</text>
    <text x="0" y="25" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="12" 
          fill="#666"
          text-anchor="middle">アプリケーション</text>
  </g>
  
  <!-- Applicationsフォルダ位置 (右側) -->
  <g transform="translate(415, 180)">
    <!-- Applicationsフォルダドロップゾーン -->
    <rect x="-60" y="-60" width="120" height="120" 
          fill="none" 
          stroke="#667eea" 
          stroke-width="2" 
          stroke-dasharray="5,5" 
          rx="10"/>
    
    <!-- フォルダアイコンプレースホルダー -->
    <rect x="-20" y="-35" width="40" height="30" 
          fill="#87CEEB" 
          rx="5"/>
    <rect x="-15" y="-40" width="30" height="5" 
          fill="#4682B4" 
          rx="2"/>
    
    <text x="0" y="10" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="14" 
          fill="#333"
          text-anchor="middle">Applications</text>
    <text x="0" y="25" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="12" 
          fill="#666"
          text-anchor="middle">フォルダ</text>
  </g>
  
  <!-- インストール指示矢印 -->
  <g transform="translate(270, 190)">
    <!-- 矢印 -->
    <path d="M-50,0 L50,0 M40,-8 L50,0 L40,8" 
          stroke="#667eea" 
          stroke-width="2" 
          fill="none"/>
    
    <text x="0" y="20" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="12" 
          fill="#333"
          text-anchor="middle">ドラッグしてインストール</text>
  </g>
  
  <!-- バージョン情報エリア -->
  <g transform="translate(270, 350)">
    <text x="0" y="0" 
          font-family="SF Pro Display, -apple-system, sans-serif" 
          font-size="10" 
          fill="#999"
          text-anchor="middle">Version 1.0.0 - macOS 11.0+</text>
  </g>
</svg>`;
  
  return svg;
}

// SVGファイルを作成
function createDMGBackground() {
  const buildDir = path.join(__dirname, '../build');
  const svgContent = createDMGBackgroundSVG();
  const svgPath = path.join(buildDir, 'dmg-background.svg');
  
  // buildディレクトリが存在しない場合は作成
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  fs.writeFileSync(svgPath, svgContent);
  
  console.log('✓ dmg-background.svg を生成しました');
  console.log(`  保存先: ${svgPath}`);
  
  return svgPath;
}

// 実行
const svgPath = createDMGBackground();

console.log('');
console.log('次のステップ:');
console.log('1. SVGファイルをPNGに変換:');
console.log('   - オンライン変換: https://cloudconvert.com/svg-to-png');
console.log('   - ローカル変換: Inkscape使用');
console.log('   - サイズ: 540x380px');
console.log('2. 変換したPNGを build/dmg-background.png として保存');
console.log('');
console.log('または、以下のコマンドでPNG変換（Inkscapeがインストールされている場合）:');
console.log(`   inkscape --export-type=png --export-width=540 --export-height=380 "${svgPath}" -o build/dmg-background.png`);