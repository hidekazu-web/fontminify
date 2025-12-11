import { SubsetOptions, ProgressState } from '../../shared/types';
import { getCharacterSetFromPreset } from '../../shared/presets';
import { readFileSync } from 'fs';
const subsetFontLib = require('subset-font');

export async function subsetFont(
  options: SubsetOptions,
  progressCallback: (progress: ProgressState) => void
): Promise<Buffer> {
  try {
    // プログレス更新: 解析開始
    progressCallback({
      phase: 'analyzing',
      progress: 10,
      currentFile: options.inputPath,
      totalFiles: 1,
      processedFiles: 0,
      estimatedTime: 15,
      errors: [],
    });

    // フォントファイルを読み込み
    const fontBuffer = readFileSync(options.inputPath);
    
    // 文字セットを決定
    let characterSet: string;
    if (options.customCharacters) {
      characterSet = options.customCharacters;
    } else if (options.preset) {
      characterSet = getCharacterSetFromPreset(options.preset);
    } else {
      throw new Error('文字セットまたはプリセットが指定されていません');
    }

    // プログレス更新: サブセット化開始
    progressCallback({
      phase: 'subsetting',
      progress: 30,
      currentFile: options.inputPath,
      totalFiles: 1,
      processedFiles: 0,
      estimatedTime: 10,
      errors: [],
    });

    // subset-fontを使用してサブセット化
    const subsetOptions = {
      targetFormat: options.outputFormat || 'woff2',
      text: characterSet,
      preserveNameIds: [1, 2], // フォント名を保持
      removeHinting: false,
      desubroutinize: false,
    };

    let subsetBuffer: Buffer;
    try {
      // subset-fontの正しい使用方法
      subsetBuffer = await subsetFontLib(fontBuffer, characterSet, {
        targetFormat: options.outputFormat || 'woff2',
        preserveHinting: !options.removeHinting,
        desubroutinize: options.desubroutinize || false
      });
    } catch (subsetError) {
      const errorMessage = subsetError instanceof Error ? subsetError.message : 'unknown error';
      console.error('サブセット化エラー:', subsetError);
      throw new Error(`フォントサブセット化に失敗しました: ${errorMessage}`);
    }

    // プログレス更新: 最適化
    progressCallback({
      phase: 'optimizing',
      progress: 80,
      currentFile: options.inputPath,
      totalFiles: 1,
      processedFiles: 0,
      estimatedTime: 3,
      errors: [],
    });

    // WOFF2圧縮処理
    let finalBuffer = subsetBuffer;
    if (options.enableWoff2Compression && options.outputFormat !== 'woff2') {
      progressCallback({
        phase: 'compressing',
        progress: 85,
        currentFile: options.inputPath,
        totalFiles: 1,
        processedFiles: 0,
        estimatedTime: 2,
        errors: [],
      });

      // WOFF2形式に再変換（最適化オプション付き）
      const woff2Options = {
        targetFormat: 'woff2',
        text: characterSet,
        preserveNameIds: [1, 2],
        removeHinting: options.removeHinting || false,
        desubroutinize: options.desubroutinize || false,
        // WOFF2特有の最適化オプション
        compressionLevel: 6, // 0-10 (高いほど圧縮率が高い)
        transformGlyf: true,  // グリフテーブル変換で圧縮率向上
      };
      
      try {
        finalBuffer = await subsetFontLib(fontBuffer, { text: characterSet, targetFormat: 'woff2' });
      } catch (woff2Error) {
        console.warn('WOFF2 compression failed, using original format:', woff2Error);
        // WOFF2圧縮に失敗した場合は元の形式を使用
        finalBuffer = subsetBuffer;
      }
    }

    // プログレス更新: 完了
    progressCallback({
      phase: 'complete',
      progress: 100,
      currentFile: options.inputPath,
      totalFiles: 1,
      processedFiles: 1,
      estimatedTime: 0,
      errors: [],
    });

    return finalBuffer;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    
    progressCallback({
      phase: 'complete',
      progress: 0,
      currentFile: options.inputPath,
      totalFiles: 1,
      processedFiles: 0,
      estimatedTime: 0,
      errors: [{
        type: 'SUBSET_FAILED' as any,
        message: errorMessage,
        details: options.inputPath,
        recoverable: true,
      }],
    });

    throw new Error(`フォントサブセット化に失敗しました: ${errorMessage}`);
  }
}

export async function estimateSubsetSize(
  filePath: string,
  characterSet: string,
  enableWoff2Compression: boolean = true
): Promise<{ originalSize: number; estimatedSize: number; compressionRatio: number }> {
  try {
    const fontBuffer = readFileSync(filePath);
    const originalSize = fontBuffer.length;
    
    // 簡易的なサイズ推定（実際の文字数比率ベース）
    const fontkit = await import('fontkit');
    const fontOrCollection = fontkit.openSync(fontBuffer);
    const font = 'fonts' in fontOrCollection ? fontOrCollection.fonts[0] : fontOrCollection;
    const totalGlyphs = font.numGlyphs;
    const usedGlyphs = new Set(characterSet).size;
    
    // 概算での圧縮率計算
    const glyphRatio = usedGlyphs / totalGlyphs;
    let compressionFactor = 0.8; // 基本的なサブセット圧縮
    
    if (enableWoff2Compression) {
      compressionFactor = 0.4; // WOFF2の優秀な圧縮率
    }
    
    const estimatedSize = Math.round(originalSize * glyphRatio * compressionFactor);
    const compressionRatio = ((originalSize - estimatedSize) / originalSize) * 100;
    
    return {
      originalSize,
      estimatedSize,
      compressionRatio: Math.round(compressionRatio * 100) / 100,
    };
  } catch (error) {
    throw new Error(`サイズ推定に失敗しました: ${error}`);
  }
}

export async function compressToWoff2(
  fontBuffer: Buffer,
  options: {
    compressionLevel?: number;
    transformGlyf?: boolean;
    removeHinting?: boolean;
    desubroutinize?: boolean;
  } = {}
): Promise<Buffer> {
  try {
    // WOFF2圧縮専用オプション
    const woff2Options = {
      targetFormat: 'woff2',
      compressionLevel: options.compressionLevel || 6,
      transformGlyf: options.transformGlyf !== false,
      removeHinting: options.removeHinting || false,
      desubroutinize: options.desubroutinize || false,
      preserveNameIds: [1, 2], // フォント名を保持
    };

    const compressedBuffer = await subsetFontLib(fontBuffer, { targetFormat: 'woff2' });
    return compressedBuffer;
  } catch (error) {
    throw new Error(`WOFF2圧縮に失敗しました: ${error}`);
  }
}

export function calculateCompressionStats(
  originalSize: number,
  compressedSize: number
): {
  compressionRatio: number;
  sizeDifference: number;
  percentReduction: number;
} {
  const sizeDifference = originalSize - compressedSize;
  const percentReduction = (sizeDifference / originalSize) * 100;
  const compressionRatio = compressedSize / originalSize;

  return {
    compressionRatio: Math.round(compressionRatio * 1000) / 1000,
    sizeDifference,
    percentReduction: Math.round(percentReduction * 100) / 100,
  };
}