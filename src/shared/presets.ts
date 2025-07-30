import { CHARACTER_SETS } from './constants';
import { CharacterSetPreset, CharCategory } from './types';

export interface PresetDefinition {
  id: CharacterSetPreset;
  label: string;
  description: string;
  characters: string;
  estimatedSize: number; // 文字数
  categories: CharCategory[];
}

export const CHARACTER_PRESETS: PresetDefinition[] = [
  {
    id: 'hiragana-katakana',
    label: 'ひらがな・カタカナ',
    description: 'ひらがな・カタカナのみ（146文字）',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana,
    estimatedSize: 146,
    categories: ['hiragana', 'katakana'],
  },
  {
    id: 'ascii',
    label: 'ASCII文字',
    description: '英数字・記号のみ（95文字）',
    characters: CHARACTER_SETS.ascii,
    estimatedSize: 95,
    categories: ['ascii'],
  },
  {
    id: 'kanji-n5',
    label: 'JLPT N5漢字',
    description: '最も基本的な漢字（約100文字）',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN5 + CHARACTER_SETS.ascii,
    estimatedSize: 341,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'kanji-n4',
    label: 'JLPT N4漢字',
    description: 'N5 + N4レベルの漢字（約300文字）',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN4 + CHARACTER_SETS.ascii,
    estimatedSize: 541,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-basic'],
  },
  {
    id: 'kanji-n3',
    label: 'JLPT N3漢字',
    description: 'N5-N3レベルの漢字（約650文字）',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiN3 + CHARACTER_SETS.ascii,
    estimatedSize: 891,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'kanji-joyo',
    label: '常用漢字',
    description: '小中学校で学ぶ漢字（約1000文字）',
    characters: CHARACTER_SETS.hiragana + CHARACTER_SETS.katakana + CHARACTER_SETS.kanjiJoyo + CHARACTER_SETS.ascii,
    estimatedSize: 1291,
    categories: ['hiragana', 'katakana', 'ascii', 'kanji-standard'],
  },
  {
    id: 'custom',
    label: 'カスタム',
    description: '独自の文字セット',
    characters: '',
    estimatedSize: 0,
    categories: [],
  },
];

export function getPresetDefinition(id: CharacterSetPreset): PresetDefinition | undefined {
  return CHARACTER_PRESETS.find(preset => preset.id === id);
}

export function getCharacterSetFromPreset(preset: CharacterSetPreset): string {
  const definition = getPresetDefinition(preset);
  return definition?.characters || '';
}

export function getUniqueCharacters(text: string): string {
  return Array.from(new Set(text)).join('');
}