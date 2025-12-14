declare module 'woff2-encoder' {
  /**
   * TTFデータをWOFF2形式に圧縮
   * @param data TTFフォントデータ
   * @returns WOFF2エンコードされたデータ
   */
  export function compress(data: Uint8Array | ArrayBuffer): Promise<Uint8Array>
}
