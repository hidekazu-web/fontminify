import { CHARACTER_SETS } from './constants';
import { CharacterSetPreset, CharCategory } from './types';

export interface PresetDefinition {
  id: CharacterSetPreset | 'minimum' | 'basic' | 'standard' | 'extended' | 'full';
  name: string;
  description: string;
  characters: string;
  characterCount: number; // 文字数
  categories: CharCategory[];
  label?: string; // UI表示用ラベル
  estimatedSize?: number; // 推定ファイルサイズ（KB）
}

export const CHARACTER_PRESETS: PresetDefinition[] = [
  {
    id: 'minimum',
    name: '最小セット',
    description: 'ひらがな・カタカナ・英数字・基本記号',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii).size,
    categories: ['hiragana', 'katakana', 'ascii'],
  },
  {
    id: 'basic',
    name: '基本セット',
    description: '最小セット + N5レベル漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'standard',
    name: '標準セット',
    description: '基本セット + N4レベル漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.kanjiN4,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.kanjiN4).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'extended',
    name: '拡張セット',
    description: '標準セット + N3レベル漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.kanjiN4 + CHARACTER_SETS.kanjiN3,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.kanjiN4 + CHARACTER_SETS.kanjiN3).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-advanced'],
  },
  {
    id: 'full',
    name: 'フルセット',
    description: '拡張セット + 常用漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.kanjiN4 + CHARACTER_SETS.kanjiN3 + CHARACTER_SETS.kanjiJoyo,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.ascii + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.kanjiN4 + CHARACTER_SETS.kanjiN3 + CHARACTER_SETS.kanjiJoyo).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-complete'],
  },
  {
    id: 'kanji-n5',
    name: 'JLPT N5漢字',
    description: '最も基本的な漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.ascii,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.ascii).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'kanji-n4',
    name: 'JLPT N4漢字',
    description: 'N5 + N4レベルの漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN4 + CHARACTER_SETS.ascii,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN4 + CHARACTER_SETS.ascii).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'kanji-n3',
    name: 'JLPT N3漢字',
    description: 'N5-N3レベルの漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN3 + CHARACTER_SETS.ascii,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN3 + CHARACTER_SETS.ascii).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'kanji-joyo',
    name: '常用漢字',
    description: '小中学校で学ぶ漢字',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiJoyo + CHARACTER_SETS.ascii,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiJoyo + CHARACTER_SETS.ascii).size,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'hiragana-katakana',
    name: 'ひらがな・カタカナ',
    description: 'ひらがな・カタカナのみ',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana,
    characterCount: new Set(CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana).size,
    categories: ['hiragana', 'katakana'],
  },
  {
    id: 'ascii',
    name: 'ASCII文字',
    description: '英数字・記号のみ',
    characters: CHARACTER_SETS.ascii,
    characterCount: new Set(CHARACTER_SETS.ascii).size,
    categories: ['ascii'],
  },
  {
    id: 'custom',
    name: 'カスタム',
    description: '独自の文字セット',
    characters: '',
    characterCount: 0,
    categories: [],
  },
];

export function getPresetDefinition(id: string): PresetDefinition | undefined {
  return CHARACTER_PRESETS.find(preset => preset.id === id);
}

export function getCharacterSetFromPreset(preset: string): string {
  const definition = getPresetDefinition(preset);
  return definition?.characters || '';
}

export function getUniqueCharacters(text: string): string {
  return Array.from(new Set(text)).join('');
}