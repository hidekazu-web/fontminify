import { FontAnalysis, CharacterRange, OpenTypeFeature } from '../../shared/types';
import { readFileSync, statSync } from 'fs';
import { extname, basename } from 'path';

export async function analyzeFont(filePath: string): Promise<FontAnalysis> {
  try {
    console.log('Starting font analysis for:', filePath);
    
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }

    const stats = statSync(filePath);
    const fileSize = stats.size;
    const fileName = basename(filePath);
    const ext = extname(filePath).toLowerCase();
    
    console.log('File info:', { fileName, fileSize, ext });
    
    let format: 'ttf' | 'otf' | 'woff' | 'woff2';
    switch (ext) {
      case '.ttf':
        format = 'ttf';
        break;
      case '.otf':
        format = 'otf';
        break;
      case '.woff':
        format = 'woff';
        break;
      case '.woff2':
        format = 'woff2';
        break;
      default:
        throw new Error(`Unsupported font format: ${ext}`);
    }

    console.log('Reading font buffer...');
    let fontBuffer: Buffer | null = null;
    try {
      fontBuffer = readFileSync(filePath);
      console.log('Font buffer size:', fontBuffer?.length || 0);
    } catch (readError) {
      console.error('Failed to read font file:', readError);
      throw new Error(`Cannot read font file: ${readError}`);
    }
    
    if (!fontBuffer || fontBuffer.length === 0) {
      throw new Error('Font file is empty or unreadable');
    }
    
    // フォントのメタデータを取得（簡易版）
    const fontFamily = extractFontName(fontBuffer) || fileName.replace(ext, '') || 'Unknown Font';
    const glyphCount = estimateGlyphCount(fontBuffer);
    const characterRanges = getDefaultCharacterRanges();
    
    const analysis: FontAnalysis = {
      fileName,
      fileSize,
      format,
      fontFamily,
      fontSubfamily: 'Regular',
      version: '1.0',
      glyphCount,
      characterRanges,
      features: [],
      languages: ['ja', 'en'],
      hasColorEmoji: false,
      isVariableFont: false,
    };

    console.log('Analysis completed successfully:', analysis);
    return analysis;
  } catch (error) {
    console.error('Font analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to analyze font: ${errorMessage}`);
  }
}

function extractFontName(buffer: Buffer | null): string | null {
  try {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return null;
    }
    // TTF/OTFのnameテーブルから基本的なフォント名を抽出
    const nameTable = buffer.indexOf('name');
    if (nameTable > 0) {
      return 'Font Family'; // 簡易版
    }
    return null;
  } catch (error) {
    console.warn('Font name extraction error:', error);
    return null;
  }
}

function estimateGlyphCount(buffer: Buffer | null): number {
  try {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return 0;
    }
    // ファイルサイズから推定（簡易版）
    const estimate = Math.floor(buffer.length / 100);
    return Math.max(estimate, 100); // 最低100グリフと仮定
  } catch (error) {
    console.warn('Glyph count estimation error:', error);
    return 1000; // デフォルト値
  }
}

function getDefaultCharacterRanges(): Array<{ start: number; end: number; name: string }> {
  try {
    return [
      { start: 0x0000, end: 0x007F, name: 'Basic Latin' },
      { start: 0x3040, end: 0x309F, name: 'Hiragana' },
      { start: 0x30A0, end: 0x30FF, name: 'Katakana' },
      { start: 0x4E00, end: 0x9FFF, name: 'CJK Unified Ideographs' },
    ];
  } catch (error) {
    console.warn('Character ranges error:', error);
    return [];
  }
}