import { OutputFormat } from '../../shared/types'

/**
 * MIMEタイプを取得
 */
export function getMimeType(format: OutputFormat): string {
  const mimeTypes: Record<OutputFormat, string> = {
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2'
  }
  return mimeTypes[format]
}

/**
 * 出力ファイル名を生成
 */
export function generateOutputFileName(
  originalName: string,
  format: OutputFormat
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  return `${baseName}-subset.${format}`
}

/**
 * ファイルをダウンロード
 */
export function downloadFile(
  data: Uint8Array,
  fileName: string,
  mimeType: string
): void {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // メモリ解放（少し遅延させる）
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * File System Access API対応チェック
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window
}

/**
 * File System Access APIを使用してファイルを保存
 * @returns 保存成功ならtrue、キャンセルならfalse
 */
export async function saveWithFilePicker(
  data: Uint8Array,
  suggestedName: string,
  format: OutputFormat
): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    return false
  }

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [{
        description: 'Font File',
        accept: { [getMimeType(format)]: [`.${format}`] }
      }]
    })

    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()

    return true
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return false // ユーザーがキャンセル
    }
    throw error
  }
}

/**
 * スマートダウンロード: File System Access API対応ならそれを使用、非対応なら通常ダウンロード
 */
export async function smartDownload(
  data: Uint8Array,
  fileName: string,
  format: OutputFormat
): Promise<void> {
  console.log('[Download] Starting download:', fileName, 'size:', data.length)
  const mimeType = getMimeType(format)

  // File System Access API対応ブラウザの場合はファイルピッカーを表示
  if (isFileSystemAccessSupported()) {
    console.log('[Download] Using File System Access API')
    const saved = await saveWithFilePicker(data, fileName, format)
    if (saved) {
      console.log('[Download] File saved via File System Access API')
      return
    }
    console.log('[Download] File picker cancelled, falling back to blob download')
  }

  // 通常のダウンロード
  console.log('[Download] Using blob download')
  downloadFile(data, fileName, mimeType)
  console.log('[Download] Download triggered')
}
