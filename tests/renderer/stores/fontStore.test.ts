import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFontStore } from '@renderer/stores/fontStore';
import type { FontAnalysis } from '@shared/types';

// ElectronAPIのモック
const mockElectronAPI = {
  analyzeFont: vi.fn(),
  selectFiles: vi.fn(),
  subsetFont: vi.fn(),
  saveFileDialog: vi.fn(),
  onProgressUpdate: vi.fn(),
  onProcessingCancelled: vi.fn(),
  cancelProcessing: vi.fn(),
};

// グローバルwindowオブジェクトのモック
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('useFontStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ストアの状態をリセット
    const { result } = renderHook(() => useFontStore());
    act(() => {
      result.current.clearFiles();
      result.current.clearErrors();
    });
  });

  describe('file management', () => {
    it('should add files to the store', async () => {
      const { result } = renderHook(() => useFontStore());
      
      const mockAnalysis: FontAnalysis = {
        fileName: 'test.ttf',
        fileSize: 1024,
        format: 'ttf',
        fontFamily: 'Test Font',
        fontSubfamily: 'Regular',
        version: '1.0',
        glyphCount: 100,
        characterRanges: [],
        features: [],
        languages: ['ja'],
        hasColorEmoji: false,
        isVariableFont: false
      };

      mockElectronAPI.analyzeFont.mockResolvedValue(mockAnalysis);

      await act(async () => {
        await result.current.addFiles(['/path/to/test.ttf']);
      });

      expect(result.current.selectedFiles).toContain('/path/to/test.ttf');
      expect(result.current.fontAnalyses['/path/to/test.ttf']).toEqual(mockAnalysis);
    });

    it('should remove files from the store', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.addFiles(['/path/to/test.ttf']);
      });

      expect(result.current.selectedFiles).toContain('/path/to/test.ttf');

      act(() => {
        result.current.removeFile('/path/to/test.ttf');
      });

      expect(result.current.selectedFiles).not.toContain('/path/to/test.ttf');
      expect(result.current.fontAnalyses['/path/to/test.ttf']).toBeUndefined();
    });

    it('should clear all files', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.addFiles(['/path/to/test1.ttf', '/path/to/test2.ttf']);
      });

      expect(result.current.selectedFiles).toHaveLength(2);

      act(() => {
        result.current.clearFiles();
      });

      expect(result.current.selectedFiles).toHaveLength(0);
      expect(Object.keys(result.current.fontAnalyses)).toHaveLength(0);
    });

    it('should not add duplicate files', async () => {
      const { result } = renderHook(() => useFontStore());
      
      mockElectronAPI.analyzeFont.mockResolvedValue({} as FontAnalysis);

      await act(async () => {
        await result.current.addFiles(['/path/to/test.ttf']);
      });

      await act(async () => {
        await result.current.addFiles(['/path/to/test.ttf']);
      });

      expect(result.current.selectedFiles).toHaveLength(1);
      expect(mockElectronAPI.analyzeFont).toHaveBeenCalledTimes(1);
    });
  });

  describe('subset options', () => {
    it('should update subset options', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.updateSubsetOptions({
          outputFormat: 'woff',
          enableWoff2Compression: false
        });
      });

      expect(result.current.subsetOptions.outputFormat).toBe('woff');
      expect(result.current.subsetOptions.enableWoff2Compression).toBe(false);
    });

    it('should update preset and clear custom characters', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.setCustomCharacters('カスタム文字');
        result.current.setSelectedPreset('basic');
      });

      expect(result.current.selectedPreset).toBe('basic');
      expect(result.current.subsetOptions.preset).toBe('basic');
    });

    it('should update custom characters when preset is custom', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.setSelectedPreset('custom');
        result.current.setCustomCharacters('あいうえお');
      });

      expect(result.current.customCharacters).toBe('あいうえお');
      expect(result.current.subsetOptions.customCharacters).toBe('あいうえお');
      expect(result.current.subsetOptions.preset).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should add errors to the store', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.addError(new Error('テストエラー'), '/path/to/font.ttf');
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.hasErrors).toBe(true);
      expect(result.current.errors[0].message).toBe('テストエラー');
      expect(result.current.errors[0].filePath).toBe('/path/to/font.ttf');
    });

    it('should remove errors by index', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.addError(new Error('エラー1'));
        result.current.addError(new Error('エラー2'));
      });

      expect(result.current.errors).toHaveLength(2);

      act(() => {
        result.current.removeError(0);
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].message).toBe('エラー2');
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.addError(new Error('エラー1'));
        result.current.addError(new Error('エラー2'));
      });

      expect(result.current.errors).toHaveLength(2);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toHaveLength(0);
      expect(result.current.hasErrors).toBe(false);
    });

    it('should handle async operations with error handling', async () => {
      const { result } = renderHook(() => useFontStore());
      
      const operation = vi.fn().mockRejectedValue(new Error('非同期エラー'));
      
      const returnValue = await act(async () => {
        return await result.current.handleAsyncOperation(operation, '/path/to/font.ttf');
      });

      expect(returnValue).toBeNull();
      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].message).toBe('非同期エラー');
    });

    it('should handle successful async operations', async () => {
      const { result } = renderHook(() => useFontStore());
      
      const operation = vi.fn().mockResolvedValue('成功結果');
      
      const returnValue = await act(async () => {
        return await result.current.handleAsyncOperation(operation);
      });

      expect(returnValue).toBe('成功結果');
      expect(result.current.errors).toHaveLength(0);
    });
  });

  describe('processing state', () => {
    it('should update processing state', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.setProcessing(true);
      });

      expect(result.current.isProcessing).toBe(true);

      act(() => {
        result.current.setProcessing(false);
      });

      expect(result.current.isProcessing).toBe(false);
    });

    it('should manage processing jobs', () => {
      const { result } = renderHook(() => useFontStore());
      
      const job = {
        id: 'job1',
        filePath: '/path/to/font.ttf',
        status: 'pending' as const,
        progress: 0
      };

      act(() => {
        result.current.addProcessingJob(job);
      });

      expect(result.current.processingJobs).toHaveLength(1);
      expect(result.current.processingJobs[0]).toEqual(job);

      act(() => {
        result.current.updateProcessingJob('job1', { 
          status: 'processing', 
          progress: 50 
        });
      });

      expect(result.current.processingJobs[0].status).toBe('processing');
      expect(result.current.processingJobs[0].progress).toBe(50);
    });

    it('should calculate processing progress correctly', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.addProcessingJob({
          id: 'job1',
          filePath: '/path/to/font1.ttf',
          status: 'processing',
          progress: 25
        });
        result.current.addProcessingJob({
          id: 'job2',
          filePath: '/path/to/font2.ttf',
          status: 'processing',
          progress: 75
        });
      });

      expect(result.current.getProcessingProgress()).toBe(50); // (25 + 75) / 2
    });
  });

  describe('dark mode', () => {
    it('should toggle dark mode', () => {
      const { result } = renderHook(() => useFontStore());
      
      const initialMode = result.current.isDarkMode;

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(result.current.isDarkMode).toBe(!initialMode);
    });

    it('should set dark mode directly', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.setDarkMode(true);
      });

      expect(result.current.isDarkMode).toBe(true);

      act(() => {
        result.current.setDarkMode(false);
      });

      expect(result.current.isDarkMode).toBe(false);
    });
  });

  describe('computed values', () => {
    it('should get effective character set from preset', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.setSelectedPreset('minimum');
      });

      const characterSet = result.current.getEffectiveCharacterSet();
      expect(characterSet).toBeTruthy();
      expect(characterSet.length).toBeGreaterThan(0);
    });

    it('should get effective character set from custom characters', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.setSelectedPreset('custom');
        result.current.setCustomCharacters('あいうえお');
      });

      const characterSet = result.current.getEffectiveCharacterSet();
      expect(characterSet).toBe('あいうえお');
    });

    it('should calculate total character count', () => {
      const { result } = renderHook(() => useFontStore());
      
      act(() => {
        result.current.setSelectedPreset('custom');
        result.current.setCustomCharacters('あいうあいう'); // 重複文字あり
      });

      const count = result.current.getTotalCharacterCount();
      expect(count).toBe(3); // 重複を除いた文字数
    });
  });
});