import { CHARACTER_SETS } from './constants';
import { CharacterSetPreset, CharCategory } from './types';

export interface PresetDefinition {
  id: CharacterSetPreset | 'minimum' | 'standard' | 'joyo-jis1' | 'custom';
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
 * 参照: https://u-618.org/webfont-subset/
 * - 最小: ひらがな・カタカナ・ASCII・全角記号（漢字なし）
 * - 標準: 最小 + 常用漢字2136字
 * - 常用漢字＋第一水準その他: 常用漢字＋JIS第1水準（約3700字、推奨、デフォルト）
 */
const PRESET_CONFIGS: PresetConfig[] = [
  {
    id: 'minimum',
    name: '最小セット',
    description: 'ひらがな・カタカナ・英数字・記号（漢字なし）',
    sets: ['hiragana', 'katakana', 'ascii', 'japaneseSymbols', 'fullwidthAlphanumeric'],
    categories: ['hiragana', 'katakana', 'ascii', 'symbols'],
  },
  {
    id: 'standard',
    name: '標準セット',
    description: '最小セット + 常用漢字2136字',
    sets: ['hiragana', 'katakana', 'ascii', 'japaneseSymbols', 'fullwidthAlphanumeric', 'joyoKanji'],
    categories: ['hiragana', 'katakana', 'ascii', 'symbols', 'kanji-standard'],
  },
  {
    id: 'joyo-jis1',
    name: '常用漢字＋第一水準その他（推奨）',
    description: '常用漢字＋JIS第1水準漢字（約3700字）',
    sets: ['hiragana', 'katakana', 'ascii', 'japaneseSymbols', 'fullwidthAlphanumeric', 'joyoKanji', 'jis1Kanji'],
    categories: ['hiragana', 'katakana', 'ascii', 'symbols', 'kanji-standard', 'kanji-jis1'],
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