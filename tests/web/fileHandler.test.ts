import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  readFileAsUint8Array,
  validateFontFile,
  getMimeType
} from '../../src/web/services/fileHandler'

describe('fileHandler', () => {
  describe('validateFontFile', () => {
    it('有効なTTFファイルを受け入れる', () => {
      const file = new File(['test'], 'font.ttf', { type: 'font/ttf' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('有効なOTFファイルを受け入れる', () => {
      const file = new File(['test'], 'font.otf', { type: 'font/otf' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(true)
    })

    it('有効なWOFFファイルを受け入れる', () => {
      const file = new File(['test'], 'font.woff', { type: 'font/woff' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(true)
    })

    it('有効なWOFF2ファイルを受け入れる', () => {
      const file = new File(['test'], 'font.woff2', { type: 'font/woff2' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(true)
    })

    it('大文字の拡張子も受け入れる', () => {
      const file = new File(['test'], 'font.TTF', { type: 'font/ttf' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(true)
    })

    it('対応していない拡張子を拒否する', () => {
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('対応していないファイル形式')
    })

    it('画像ファイルを拒否する', () => {
      const file = new File(['test'], 'image.png', { type: 'image/png' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('対応していないファイル形式')
    })

    it('100MBを超えるファイルを拒否する', () => {
      // 101MBのダミーデータ
      const largeData = new Uint8Array(101 * 1024 * 1024)
      const file = new File([largeData], 'large-font.ttf', { type: 'font/ttf' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('ファイルサイズが大きすぎます')
    })

    it('空のファイルを拒否する', () => {
      const file = new File([], 'empty.ttf', { type: 'font/ttf' })
      const result = validateFontFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('ファイルが空です')
    })
  })

  describe('getMimeType', () => {
    it('TTFファイルのMIMEタイプを返す', () => {
      expect(getMimeType('font.ttf')).toBe('font/ttf')
    })

    it('OTFファイルのMIMEタイプを返す', () => {
      expect(getMimeType('font.otf')).toBe('font/otf')
    })

    it('WOFFファイルのMIMEタイプを返す', () => {
      expect(getMimeType('font.woff')).toBe('font/woff')
    })

    it('WOFF2ファイルのMIMEタイプを返す', () => {
      expect(getMimeType('font.woff2')).toBe('font/woff2')
    })

    it('不明な拡張子はapplication/octet-streamを返す', () => {
      expect(getMimeType('font.xyz')).toBe('application/octet-stream')
    })

    it('拡張子がないファイルはapplication/octet-streamを返す', () => {
      expect(getMimeType('fontfile')).toBe('application/octet-stream')
    })

    it('大文字の拡張子も正しく処理する', () => {
      expect(getMimeType('font.TTF')).toBe('font/ttf')
    })
  })

  describe('readFileAsUint8Array', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('ファイルをUint8Arrayとして読み込む', async () => {
      const content = new Uint8Array([0x00, 0x01, 0x00, 0x00]) // TTF magic number
      const file = new File([content], 'test.ttf', { type: 'font/ttf' })

      const result = await readFileAsUint8Array(file)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(4)
      expect(result[0]).toBe(0x00)
      expect(result[1]).toBe(0x01)
    })

    it('文字列コンテンツを正しく読み込む', async () => {
      const content = 'test content'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const result = await readFileAsUint8Array(file)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(content.length)
    })

    it('大きなファイルを読み込む', async () => {
      const largeContent = new Uint8Array(1024 * 1024) // 1MB
      for (let i = 0; i < largeContent.length; i++) {
        largeContent[i] = i % 256
      }
      const file = new File([largeContent], 'large.ttf', { type: 'font/ttf' })

      const result = await readFileAsUint8Array(file)

      expect(result.length).toBe(1024 * 1024)
      expect(result[0]).toBe(0)
      expect(result[255]).toBe(255)
      expect(result[256]).toBe(0)
    })

    it('空のファイルを読み込む', async () => {
      const file = new File([], 'empty.ttf', { type: 'font/ttf' })

      const result = await readFileAsUint8Array(file)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(0)
    })
  })
})
