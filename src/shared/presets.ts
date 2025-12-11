import { CHARACTER_SETS } from './constants';
import { CharacterSetPreset, CharCategory } from './types';

export interface PresetDefinition {
  id: CharacterSetPreset | 'minimum' | 'basic' | 'standard' | 'extended' | 'full';
  name: string;
  description: string;
  characters: string;
  characterCount: number;
  categories: CharCategory[];
  label?: string;
  estimatedSize?: number;
}

/**
 * 文字セットキーの型定義
 */
type CharacterSetKey = keyof typeof CHARACTER_SETS;

/**
 * プリセット設定の型定義
 */
interface PresetConfig {
  id: PresetDefinition['id'];
  name: string;
  description: string;
  sets: CharacterSetKey[];
  categories: CharCategory[];
}

/**
 * 文字セットを結合し、ユニーク文字数を計算するビルダー関数
 */
function buildPreset(config: PresetConfig): PresetDefinition {
  const characters = config.sets.map(key => CHARACTER_SETS[key]).join('');
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    characters,
    characterCount: new Set(characters).size,
    categories: config.categories,
  };
}

/**
 * プリセット設定の定義
 */
const PRESET_CONFIGS: PresetConfig[] = [
  {
    id: 'minimum',
    name: '最小セット',
    description: 'ひらがな・カタカナ・英数字・基本記号',
    sets: ['hiragana', 'katakana', 'ascii'],
    categories: ['hiragana', 'katakana', 'ascii'],
  },
  {
    id: 'basic',
    name: '基本セット',
    description: '最小セット + N5レベル漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiN5'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'standard',
    name: '標準セット',
    description: '基本セット + N4レベル漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiN5', 'kanjiN4'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'extended',
    name: '拡張セット',
    description: '標準セット + N3レベル漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiN5', 'kanjiN4', 'kanjiN3'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-advanced'],
  },
  {
    id: 'full',
    name: 'フルセット',
    description: '拡張セット + 常用漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiN5', 'kanjiN4', 'kanjiN3', 'kanjiJoyo'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-complete'],
  },
  {
    id: 'kanji-n5',
    name: 'JLPT N5漢字',
    description: '最も基本的な漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiN5'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'kanji-n4',
    name: 'JLPT N4漢字',
    description: 'N5 + N4レベルの漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiN4'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'kanji-n3',
    name: 'JLPT N3漢字',
    description: 'N5-N3レベルの漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiN3'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'kanji-joyo',
    name: '常用漢字',
    description: '小中学校で学ぶ漢字',
    sets: ['hiragana', 'katakana', 'ascii', 'kanjiJoyo'],
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'hiragana-katakana',
    name: 'ひらがな・カタカナ',
    description: 'ひらがな・カタカナのみ',
    sets: ['hiragana', 'katakana'],
    categories: ['hiragana', 'katakana'],
  },
  {
    id: 'ascii',
    name: 'ASCII文字',
    description: '英数字・記号のみ',
    sets: ['ascii'],
    categories: ['ascii'],
  },
];

/**
 * ビルダー関数で生成されたプリセット一覧
 */
export const CHARACTER_PRESETS: PresetDefinition[] = [
  ...PRESET_CONFIGS.map(buildPreset),
  // カスタムプリセットは特殊なため手動定義
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