// 常用漢字をファイルに出力するスクリプト
const fs = require('fs');
const path = require('path');
const joyoKanjiModule = require('joyo-kanji');

// パッケージは { kanji: [...] } の形式
const joyoKanji = joyoKanjiModule.kanji;

const outputDir = path.join(__dirname, '../src/shared/charsets');

// 100字ずつに分割
const chunks = [];
for (let i = 0; i < joyoKanji.length; i += 100) {
  chunks.push(joyoKanji.slice(i, i + 100).join(''));
}

// kanji.tsファイルを生成
const content = `// 常用漢字 (${joyoKanji.length}字)
// joyo-kanjiパッケージから生成

const KANJI_PARTS = [
${chunks.map((chunk, i) => `  // Part ${i + 1}\n  '${chunk}'`).join(',\n')}
];

export const JOYO_KANJI = KANJI_PARTS.join('');
`;

fs.writeFileSync(path.join(outputDir, 'kanji.ts'), content);
console.log(`Generated kanji.ts with ${joyoKanji.length} characters`);
