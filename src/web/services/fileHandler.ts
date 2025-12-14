/**
 * File APIラッパー
 */

/**
 * FileをUint8Arrayとして読み込む
 */
export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer
      resolve(new Uint8Array(arrayBuffer))
    }

    reader.onerror = () => {
      reject(new Error(`ファイルの読み込みに失敗しました: ${file.name}`))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * フォントファイルのバリデーション
 */
export function validateFontFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['.ttf', '.otf', '.woff', '.woff2']
  const maxSize = 100 * 1024 * 1024 // 100MB

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `対応していないファイル形式です。${validExtensions.join(', ')} 形式のフォントを選択してください。`
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'ファイルサイズが大きすぎます。100MB以下のファイルを選択してください。'
    }
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'ファイルが空です。'
    }
  }

  return { valid: true }
}

/**
 * ファイルの拡張子からMIMEタイプを取得
 */
export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2'
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}
