import { SubsetOptions, ProgressState, ErrorType } from '../../shared/types';
import { getCharacterSetFromPreset } from '../../shared/presets';
import { readFileSync } from 'fs';
import subsetFontLib from 'subset-font';

/**
 * プログレスコールバックの型
 */
type ProgressCallback = (progress: ProgressState) => void;

/**
 * プログレス状態を更新するヘルパー関数
 */
function updateProgress(
  callback: ProgressCallback,
  phase: ProgressState['phase'],
  progress: number,
  inputPath: string,
  estimatedTime: number,
  errors: ProgressState['errors'] = []
): void {
  callback({
    phase,
    progress,
    currentFile: inputPath,
    totalFiles: 1,
    processedFiles: phase === 'complete' && errors.length === 0 ? 1 : 0,
    estimatedTime,
    errors,
  });
}

/**
 * 文字セットを決定
 */
function determineCharacterSet(options: SubsetOptions): string {
  if (options.customCharacters) {
    return options.customCharacters;
  }
  if (options.preset) {
    return getCharacterSetFromPreset(options.preset);
  }
  throw new Error('文字セットまたはプリセットが指定されていません');
}

/**
 * フォントをサブセット化
 */
async function performSubset(
  fontBuffer: Buffer,
  characterSet: string,
  options: SubsetOptions
): Promise<Buffer> {
  console.log('サブセット化開始:', {
    text: characterSet.slice(0, 50) + (characterSet.length > 50 ? '...' : ''),
    textLength: characterSet.length,
    targetFormat: options.outputFormat,
    bufferSize: fontBuffer.length,
  });

  try {
    const subsetFontBuffer = await subsetFontLib(fontBuffer, characterSet, {
      targetFormat: options.outputFormat || 'woff2',
      preserveHinting: !options.removeHinting,
      desubroutinize: options.desubroutinize || false,
    });

    console.log('サブセット化完了:', subsetFontBuffer.length, 'bytes');
    return subsetFontBuffer;
  } catch (subsetError: any) {
    console.error('サブセット化エラー:', subsetError);
    throw new Error(`フォントサブセット化に失敗しました: ${subsetError.message || 'unknown error'}`);
  }
}

/**
 * WOFF2形式に圧縮
 */
async function compressToWoff2Format(
  fontBuffer: Buffer,
  characterSet: string
): Promise<Buffer> {
  try {
    return await subsetFontLib(fontBuffer, { text: characterSet, targetFormat: 'woff2' });
  } catch (woff2Error) {
    console.warn('WOFF2 compression failed, using original format:', woff2Error);
    throw woff2Error;
  }
}

/**
 * フォントをサブセット化するメイン関数
 */
export async function subsetFont(
  options: SubsetOptions,
  progressCallback: ProgressCallback
): Promise<Buffer> {
  console.log('=== subsetFont called ===');
  console.log('Options:', JSON.stringify({
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    preset: options.preset,
    outputFormat: options.outputFormat,
    hasCustomCharacters: !!options.customCharacters,
  }, null, 2));

  try {
    // フェーズ1: 解析開始
    console.log('Phase 1: Analyzing...');
    updateProgress(progressCallback, 'analyzing', 10, options.inputPath, 15);

    // フォントファイルを読み込み
    console.log('Reading font file...');
    const fontBuffer = readFileSync(options.inputPath);
    console.log('Font file read successfully, size:', fontBuffer.length);

    // フェーズ2: 文字セット決定
    console.log('Phase 2: Determining character set...');
    const characterSet = determineCharacterSet(options);
    console.log('Character set determined, length:', characterSet.length);

    // フェーズ3: サブセット化
    console.log('Phase 3: Subsetting...');
    updateProgress(progressCallback, 'subsetting', 30, options.inputPath, 10);
    const subsetFontBuffer = await performSubset(fontBuffer, characterSet, options);
    console.log('Subset completed, output size:', subsetFontBuffer.length);

    // フェーズ4: 最適化
    console.log('Phase 4: Optimizing...');
    updateProgress(progressCallback, 'optimizing', 80, options.inputPath, 3);

    // フェーズ5: WOFF2圧縮（必要な場合）
    let outputBuffer = subsetFontBuffer;
    if (options.enableWoff2Compression && options.outputFormat !== 'woff2') {
      console.log('Phase 5: WOFF2 compression...');
      updateProgress(progressCallback, 'compressing', 85, options.inputPath, 2);

      try {
        outputBuffer = await compressToWoff2Format(fontBuffer, characterSet);
        console.log('WOFF2 compression completed');
      } catch (e) {
        console.warn('WOFF2 compression failed, using original format:', e);
        // WOFF2圧縮に失敗した場合は元の形式を使用
        outputBuffer = subsetFontBuffer;
      }
    }

    // フェーズ6: 完了
    console.log('Phase 6: Complete!');
    console.log('Final output size:', outputBuffer.length);
    updateProgress(progressCallback, 'complete', 100, options.inputPath, 0);

    return outputBuffer;
  } catch (error) {
    console.error('=== subsetFont ERROR ===');
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

    updateProgress(
      progressCallback,
      'complete',
      0,
      options.inputPath,
      0,
      [{
        type: ErrorType.SUBSET_FAILED,
        message: errorMessage,
        details: options.inputPath,
        recoverable: true,
      }]
    );

    throw new Error(`フォントサブセット化に失敗しました: ${errorMessage}`);
  }
}

/**
 * サブセット後のファイルサイズを推定
 */
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

/**
 * WOFF2形式に圧縮（単独関数）
 */
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
    const compressedBuffer = await subsetFontLib(fontBuffer, { targetFormat: 'woff2' });
    return compressedBuffer;
  } catch (error) {
    throw new Error(`WOFF2圧縮に失敗しました: ${error}`);
  }
}

/**
 * 圧縮統計を計算
 */
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
