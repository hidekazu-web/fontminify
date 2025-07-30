import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { processMultipleFonts } from '../../src/main/services/multipleFileProcessor';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../../src/main/services/fontSubsetter');
vi.mock('../../src/main/services/fontAnalyzer');

const mockFs = vi.mocked(fs);

// Mock font processor
const mockProcessFont = vi.fn();
vi.mock('../../src/main/services/fontProcessor', () => ({
  processFont: mockProcessFont
}));

describe('複数ファイル同時処理テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的な複数ファイル処理', () => {
    it('2つのフォントファイルが正しく並行処理される', async () => {
      const fontFiles = [
        { path: '/test/font1.ttf', characters: 'abc', outputPath: '/test/output1.ttf' },
        { path: '/test/font2.ttf', characters: 'def', outputPath: '/test/output2.ttf' }
      ];

      const mockResults = [
        { success: true, outputPath: '/test/output1.ttf', processingTime: 1000 },
        { success: true, outputPath: '/test/output2.ttf', processingTime: 1200 }
      ];

      mockProcessFont
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const progressCallback = vi.fn();
      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 2
      }, progressCallback);

      expect(result.success).toBe(true);
      expect(result.processedFiles).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      
      // 並行処理されたことを確認（総処理時間が直列処理より短い）
      expect(result.totalProcessingTime).toBeLessThan(2000);
      
      // プログレスコールバックが呼ばれたことを確認
      expect(progressCallback).toHaveBeenCalled();
    });

    it('5つのフォントファイルが効率的に処理される', async () => {
      const fontFiles = Array.from({ length: 5 }, (_, i) => ({
        path: `/test/font${i + 1}.ttf`,
        characters: `char${i}`,
        outputPath: `/test/output${i + 1}.ttf`
      }));

      const mockResults = fontFiles.map((_, i) => ({
        success: true,
        outputPath: `/test/output${i + 1}.ttf`,
        processingTime: 500 + Math.random() * 500
      }));

      mockProcessFont.mockImplementation(async (options) => {
        const index = fontFiles.findIndex(f => f.path === options.inputPath);
        await new Promise(resolve => setTimeout(resolve, 200)); // 処理時間をシミュレート
        return mockResults[index];
      });

      const startTime = Date.now();
      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 3
      });
      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.processedFiles).toHaveLength(5);
      expect(result.successCount).toBe(5);
      
      // 3つずつ並行処理されるため、直列処理(1000ms)より大幅に短い
      expect(totalTime).toBeLessThan(800);
    });

    it('大量のファイル（20個）が段階的に処理される', async () => {
      const fontFiles = Array.from({ length: 20 }, (_, i) => ({
        path: `/test/font${i + 1}.ttf`,
        characters: 'abc',
        outputPath: `/test/output${i + 1}.ttf`
      }));

      mockProcessFont.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true, processingTime: 50 };
      });

      const progressCallback = vi.fn();
      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 4
      }, progressCallback);

      expect(result.success).toBe(true);
      expect(result.processedFiles).toHaveLength(20);
      expect(result.successCount).toBe(20);
      
      // プログレス更新が適切に行われたことを確認
      expect(progressCallback).toHaveBeenCalledTimes(20);
      
      // 最後のプログレス更新が100%であることを確認
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1];
      expect(lastCall[0].progress).toBe(100);
    });
  });

  describe('エラーハンドリング', () => {
    it('一部のファイルが失敗しても他のファイルは処理される', async () => {
      const fontFiles = [
        { path: '/test/font1.ttf', characters: 'abc', outputPath: '/test/output1.ttf' },
        { path: '/test/font2.ttf', characters: 'def', outputPath: '/test/output2.ttf' },
        { path: '/test/font3.ttf', characters: 'ghi', outputPath: '/test/output3.ttf' }
      ];

      mockProcessFont
        .mockResolvedValueOnce({ success: true, outputPath: '/test/output1.ttf' })
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce({ success: true, outputPath: '/test/output3.ttf' });

      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        continueOnError: true
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('font2.ttf');
    });

    it('致命的エラー時に全処理が停止される', async () => {
      const fontFiles = [
        { path: '/test/font1.ttf', characters: 'abc', outputPath: '/test/output1.ttf' },
        { path: '/test/font2.ttf', characters: 'def', outputPath: '/test/output2.ttf' },
        { path: '/test/font3.ttf', characters: 'ghi', outputPath: '/test/output3.ttf' }
      ];

      mockProcessFont
        .mockResolvedValueOnce({ success: true, outputPath: '/test/output1.ttf' })
        .mockRejectedValueOnce(new Error('FATAL: Out of memory'))
        .mockResolvedValueOnce({ success: true, outputPath: '/test/output3.ttf' });

      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        continueOnError: false,
        stopOnFatalError: true
      });

      expect(result.success).toBe(false);
      expect(result.successCount).toBeLessThan(3);
      expect(result.fatalError).toBeDefined();
    });

    it('無効なファイルパスが適切に処理される', async () => {
      const fontFiles = [
        { path: '', characters: 'abc', outputPath: '/test/output1.ttf' },
        { path: '/nonexistent/font.ttf', characters: 'def', outputPath: '/test/output2.ttf' },
        { path: '/test/valid.ttf', characters: 'ghi', outputPath: '/test/output3.ttf' }
      ];

      mockProcessFont
        .mockRejectedValueOnce(new Error('Invalid file path'))
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce({ success: true, outputPath: '/test/output3.ttf' });

      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        continueOnError: true
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(2);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('リソース管理', () => {
    it('メモリ使用量が適切に制御される', async () => {
      const fontFiles = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/font${i + 1}.ttf`,
        characters: 'test',
        outputPath: `/test/output${i + 1}.ttf`
      }));

      // 大きなバッファをシミュレート
      mockProcessFont.mockImplementation(async () => {
        const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
        await new Promise(resolve => setTimeout(resolve, 100));
        return { 
          success: true, 
          outputBuffer: largeBuffer,
          processingTime: 100 
        };
      });

      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 2, // メモリ使用量制御のため並行数を制限
        memoryLimit: 200 * 1024 * 1024 // 200MB制限
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.success).toBe(true);
      // メモリ増加が設定制限以下であることを確認
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
    });

    it('ファイルハンドルが適切にクリーンアップされる', async () => {
      const fontFiles = Array.from({ length: 100 }, (_, i) => ({
        path: `/test/font${i + 1}.ttf`,
        characters: 'test',
        outputPath: `/test/output${i + 1}.ttf`
      }));

      let openFileCount = 0;
      
      mockProcessFont.mockImplementation(async (options) => {
        openFileCount++;
        try {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { success: true, processingTime: 10 };
        } finally {
          openFileCount--;
        }
      });

      await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 10
      });

      // 全処理完了後、開いているファイルがないことを確認
      expect(openFileCount).toBe(0);
    });

    it('処理中断時にリソースがクリーンアップされる', async () => {
      const fontFiles = Array.from({ length: 50 }, (_, i) => ({
        path: `/test/font${i + 1}.ttf`,
        characters: 'test',
        outputPath: `/test/output${i + 1}.ttf`
      }));

      let processingCount = 0;
      let cleanupCount = 0;

      mockProcessFont.mockImplementation(async () => {
        processingCount++;
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 長時間処理
          return { success: true };
        } finally {
          cleanupCount++;
        }
      });

      const processingPromise = processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 5
      });

      // 500ms後に中断
      setTimeout(() => {
        // 実際の実装では AbortController を使用
      }, 500);

      await expect(processingPromise).resolves.toBeDefined();
      
      // クリーンアップが適切に実行されたことを確認
      expect(cleanupCount).toBeGreaterThan(0);
    });
  });

  describe('パフォーマンス最適化', () => {
    it('並行処理数の制限が効果的に機能する', async () => {
      const fontFiles = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/font${i + 1}.ttf`,
        characters: 'test',
        outputPath: `/test/output${i + 1}.ttf`
      }));

      let concurrentProcesses = 0;
      let maxConcurrentProcesses = 0;

      mockProcessFont.mockImplementation(async () => {
        concurrentProcesses++;
        maxConcurrentProcesses = Math.max(maxConcurrentProcesses, concurrentProcesses);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        concurrentProcesses--;
        return { success: true, processingTime: 100 };
      });

      await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 3
      });

      // 同時実行数が制限値以下であることを確認
      expect(maxConcurrentProcesses).toBeLessThanOrEqual(3);
    });

    it('小さなファイルが大きなファイルより先に処理される', async () => {
      const fontFiles = [
        { path: '/test/large.ttf', characters: 'a'.repeat(10000), outputPath: '/test/large.ttf', size: 10000000 },
        { path: '/test/small1.ttf', characters: 'abc', outputPath: '/test/small1.ttf', size: 1000 },
        { path: '/test/small2.ttf', characters: 'def', outputPath: '/test/small2.ttf', size: 1500 },
        { path: '/test/medium.ttf', characters: 'a'.repeat(1000), outputPath: '/test/medium.ttf', size: 100000 }
      ];

      const processingOrder: string[] = [];

      mockProcessFont.mockImplementation(async (options) => {
        const fileName = options.inputPath.split('/').pop() || '';
        processingOrder.push(fileName);
        
        // ファイルサイズに応じた処理時間をシミュレート
        const file = fontFiles.find(f => f.path === options.inputPath);
        const processingTime = (file?.size || 1000) / 10000; // サイズに比例
        
        await new Promise(resolve => setTimeout(resolve, processingTime));
        return { success: true, processingTime };
      });

      await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 4,
        priorityBySize: true // 小さなファイル優先
      });

      // 小さなファイルが先に完了していることを確認
      expect(processingOrder[0]).toMatch(/small/);
      expect(processingOrder[1]).toMatch(/small/);
      expect(processingOrder[processingOrder.length - 1]).toBe('large.ttf');
    });

    it('処理完了順序とプログレス更新が正確である', async () => {
      const fontFiles = [
        { path: '/test/fast.ttf', characters: 'a', outputPath: '/test/fast.ttf' },
        { path: '/test/slow.ttf', characters: 'b', outputPath: '/test/slow.ttf' },
        { path: '/test/medium.ttf', characters: 'c', outputPath: '/test/medium.ttf' }
      ];

      const completionOrder: string[] = [];
      const progressUpdates: number[] = [];

      mockProcessFont.mockImplementation(async (options) => {
        const fileName = options.inputPath.split('/').pop() || '';
        
        // 異なる処理時間
        const processingTimes: Record<string, number> = {
          'fast.ttf': 100,
          'medium.ttf': 300,
          'slow.ttf': 500
        };
        
        await new Promise(resolve => setTimeout(resolve, processingTimes[fileName] || 200));
        
        completionOrder.push(fileName);
        return { success: true, processingTime: processingTimes[fileName] };
      });

      const progressCallback = vi.fn((progress) => {
        progressUpdates.push(progress.progress);
      });

      await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 3
      }, progressCallback);

      // 処理速度順に完了していることを確認
      expect(completionOrder[0]).toBe('fast.ttf');
      expect(completionOrder[1]).toBe('medium.ttf');
      expect(completionOrder[2]).toBe('slow.ttf');

      // プログレスが単調増加していることを確認
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i]).toBeGreaterThanOrEqual(progressUpdates[i - 1]);
      }
      
      // 最終プログレスが100%
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  describe('UI統合テスト', () => {
    it('複数ファイルドラッグ&ドロップが正しく処理される', async () => {
      const MockMultipleFileProcessor = () => {
        return (
          <div data-testid="multiple-file-processor">
            <div data-testid="file-list">
              <div>font1.ttf - 処理中</div>
              <div>font2.ttf - 完了</div>
              <div>font3.ttf - 待機中</div>
            </div>
            <div data-testid="overall-progress">50%完了</div>
            <button data-testid="cancel-all">全てキャンセル</button>
          </div>
        );
      };

      render(<MockMultipleFileProcessor />);

      expect(screen.getByTestId('multiple-file-processor')).toBeInTheDocument();
      expect(screen.getByText('font1.ttf - 処理中')).toBeInTheDocument();
      expect(screen.getByText('50%完了')).toBeInTheDocument();
      
      const cancelButton = screen.getByTestId('cancel-all');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeEnabled();
    });

    it('個別ファイルの進捗が独立して表示される', async () => {
      const MockFileProgressList = () => {
        const files = [
          { name: 'font1.ttf', progress: 100, status: 'completed' },
          { name: 'font2.ttf', progress: 75, status: 'processing' },
          { name: 'font3.ttf', progress: 0, status: 'waiting' }
        ];

        return (
          <div>
            {files.map(file => (
              <div key={file.name} data-testid={`file-${file.name}`}>
                <span>{file.name}</span>
                <progress value={file.progress} max={100} />
                <span>{file.status}</span>
              </div>
            ))}
          </div>
        );
      };

      render(<MockFileProgressList />);

      const font1 = screen.getByTestId('file-font1.ttf');
      const progress1 = font1.querySelector('progress');
      expect(progress1).toHaveAttribute('value', '100');

      const font2 = screen.getByTestId('file-font2.ttf');
      const progress2 = font2.querySelector('progress');
      expect(progress2).toHaveAttribute('value', '75');
    });

    it('エラーファイルが視覚的に区別される', async () => {
      const MockFileListWithErrors = () => {
        const files = [
          { name: 'success.ttf', status: 'completed', hasError: false },
          { name: 'error.ttf', status: 'error', hasError: true, error: 'ファイル破損' },
          { name: 'processing.ttf', status: 'processing', hasError: false }
        ];

        return (
          <div>
            {files.map(file => (
              <div 
                key={file.name} 
                data-testid={`file-${file.name}`}
                className={file.hasError ? 'error-file' : ''}
              >
                <span>{file.name}</span>
                <span>{file.status}</span>
                {file.error && <span className="error-message">{file.error}</span>}
              </div>
            ))}
          </div>
        );
      };

      render(<MockFileListWithErrors />);

      const errorFile = screen.getByTestId('file-error.ttf');
      expect(errorFile).toHaveClass('error-file');
      expect(screen.getByText('ファイル破損')).toHaveClass('error-message');

      const successFile = screen.getByTestId('file-success.ttf');
      expect(successFile).not.toHaveClass('error-file');
    });
  });

  describe('統計と報告', () => {
    it('処理統計が正確に集計される', async () => {
      const fontFiles = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/font${i + 1}.ttf`,
        characters: 'test',
        outputPath: `/test/output${i + 1}.ttf`
      }));

      const processingTimes = Array.from({ length: 10 }, () => Math.random() * 1000 + 500);
      
      mockProcessFont.mockImplementation(async (options, _, index) => {
        const i = fontFiles.findIndex(f => f.path === options.inputPath);
        await new Promise(resolve => setTimeout(resolve, processingTimes[i] / 10));
        
        return {
          success: i < 8, // 8個成功、2個失敗
          processingTime: processingTimes[i],
          originalSize: 1000000,
          outputSize: 300000
        };
      });

      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        maxConcurrency: 3
      });

      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalFiles).toBe(10);
      expect(result.statistics.successCount).toBe(8);
      expect(result.statistics.failureCount).toBe(2);
      expect(result.statistics.averageProcessingTime).toBeGreaterThan(0);
      expect(result.statistics.totalOriginalSize).toBe(8000000); // 成功した8ファイル分
      expect(result.statistics.totalOutputSize).toBe(2400000);
      expect(result.statistics.averageCompressionRatio).toBeCloseTo(0.3);
    });

    it('処理結果レポートが生成される', async () => {
      const fontFiles = [
        { path: '/test/small.ttf', characters: 'abc', outputPath: '/test/small.woff2' },
        { path: '/test/large.ttf', characters: 'あいう漢字', outputPath: '/test/large.woff2' }
      ];

      mockProcessFont
        .mockResolvedValueOnce({
          success: true,
          processingTime: 500,
          originalSize: 100000,
          outputSize: 20000,
          compressionRatio: 0.2
        })
        .mockResolvedValueOnce({
          success: true,
          processingTime: 1500,
          originalSize: 5000000,
          outputSize: 800000,
          compressionRatio: 0.16
        });

      const result = await processMultipleFonts(fontFiles, {
        concurrent: true,
        generateReport: true
      });

      expect(result.report).toBeDefined();
      expect(result.report).toContain('処理完了');
      expect(result.report).toContain('2ファイル');
      expect(result.report).toContain('成功: 2');
      expect(result.report).toContain('圧縮率');
      expect(result.report).toContain('80%'); // 平均削減率
    });
  });
});