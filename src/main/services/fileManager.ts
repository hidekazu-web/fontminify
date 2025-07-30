import { writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, extname, basename, join } from 'path';

export async function saveFileToPath(filePath: string, data: Buffer): Promise<void> {
  try {
    // ディレクトリが存在しない場合は作成
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // ファイルを保存
    writeFileSync(filePath, data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
        throw new Error('ファイルの保存に必要な権限がありません');
      } else if (error.message.includes('ENOSPC')) {
        throw new Error('ディスクの容量が不足しています');
      }
    }
    throw new Error(`ファイル保存に失敗しました: ${error}`);
  }
}

export function validateSavePath(filePath: string): { isValid: boolean; error?: string } {
  try {
    // ファイル名のバリデーション
    const fileName = basename(filePath);
    if (!fileName || fileName.length === 0) {
      return { isValid: false, error: 'ファイル名が指定されていません' };
    }

    // 不正な文字をチェック
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(fileName)) {
      return { isValid: false, error: 'ファイル名に使用できない文字が含まれています' };
    }

    // ディレクトリの存在確認
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      return { isValid: false, error: '保存先ディレクトリが存在しません' };
    }

    // 権限チェック（既存ファイルの場合）
    if (existsSync(filePath)) {
      try {
        const stats = statSync(filePath);
        if (!stats.isFile()) {
          return { isValid: false, error: '指定されたパスはファイルではありません' };
        }
      } catch (error) {
        return { isValid: false, error: 'ファイルへのアクセス権限がありません' };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: `パスの検証に失敗しました: ${error}` };
  }
}

export function generateOutputFileName(
  inputFilePath: string,
  outputFormat: string,
  suffix: string = '_subset'
): string {
  const inputName = basename(inputFilePath, extname(inputFilePath));
  const outputExt = outputFormat.startsWith('.') ? outputFormat : `.${outputFormat}`;
  return `${inputName}${suffix}${outputExt}`;
}

export function getOutputFileSize(filePath: string): number {
  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      return stats.size;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}