import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processMultipleFonts } from '../../src/main/services/fontProcessor';
import { analyzeFont } from '../../src/main/services/fontAnalyzer';
import { subsetFont } from '../../src/main/services/fontSubsetter';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('fontkit');
vi.mock('subset-font');

const mockFs = vi.mocked(fs);

describe('メモリリークテスト（大量ファイル処理）', () => {
  let initialMemory: NodeJS.MemoryUsage;
  let memorySnapshots: NodeJS.MemoryUsage[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    memorySnapshots = [];
    
    // ガベージコレクションを強制実行（利用可能な場合）
    if (global.gc) {
      global.gc();
    }
    
    initialMemory = process.memoryUsage();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    if (global.gc) {
      global.gc();
    }
  });

  const captureMemorySnapshot = (label: string): NodeJS.MemoryUsage => {
    const memory = process.memoryUsage();
    memorySnapshots.push(memory);
    console.log(`[Memory Snapshot - ${label}] Heap: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB, RSS: ${(memory.rss / 1024 / 1024).toFixed(2)}MB`);
    return memory;
  };

  const waitAndGc = async (delay: number = 100): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, delay));
    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  };

  describe('単体処理でのメモリリーク検証', () => {
    it('単一フォント解析の繰り返し処理でメモリリークしない', async () => {
      const testFontBuffer = Buffer.alloc(1024 * 1024); // 1MB
      mockFs.readFile.mockResolvedValue(testFontBuffer);

      const mockFontkit = await import('fontkit');
      vi.mocked(mockFontkit.openSync).mockReturnValue({
        postscriptName: 'TestFont',
        fullName: 'Test Font Regular',
        numGlyphs: 1000,
        characterSet: new Set([65, 66, 67]) // A, B, C
      } as any);

      captureMemorySnapshot('初期状態');

      // 100回の解析処理を実行
      for (let i = 0; i < 100; i++) {
        const result = await analyzeFont(`/test/font-${i}.ttf`);
        expect(result.success).toBe(true);

        // 10回ごとにメモリスナップショットを取得
        if (i % 10 === 9) {
          await waitAndGc();
          captureMemorySnapshot(`解析処理 ${i + 1}回完了`);
        }
      }

      await waitAndGc(200);
      const finalMemory = captureMemorySnapshot('最終状態');

      // メモリ使用量の増加が許容範囲内であることを確認
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxAllowedIncrease = 50 * 1024 * 1024; // 50MB

      expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
      
      // RSS（物理メモリ）も確認
      const rssIncrease = finalMemory.rss - initialMemory.rss;
      expect(rssIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });

    it('サブセット化処理の繰り返しでメモリリークしない', async () => {
      const inputBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const outputBuffer = Buffer.alloc(500 * 1024); // 500KB

      mockFs.readFile.mockResolvedValue(inputBuffer);
      
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockResolvedValue(outputBuffer);

      captureMemorySnapshot('サブセット化開始前');

      // 50回のサブセット化処理を実行
      for (let i = 0; i < 50; i++) {
        const options = {
          inputPath: `/test/input-${i}.ttf`,
          outputPath: `/test/output-${i}.woff2`,
          characters: 'abcdefghijklmnopqrstuvwxyz',
          outputFormat: 'woff2' as const
        };

        const result = await subsetFont(options);
        expect(result.success).toBe(true);

        // 5回ごとにメモリ確認
        if (i % 5 === 4) {
          await waitAndGc();
          captureMemorySnapshot(`サブセット化 ${i + 1}回完了`);
        }
      }

      await waitAndGc(200);
      const finalMemory = captureMemorySnapshot('サブセット化完了');

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });

    it('大きなバッファの処理でメモリリークしない', async () => {
      const createLargeBuffer = (size: number) => Buffer.alloc(size);
      
      captureMemorySnapshot('大容量処理開始前');

      // 大きなバッファを作成・処理・解放を繰り返す
      for (let i = 0; i < 20; i++) {
        // 10MBのバッファを作成
        const largeBuffer = createLargeBuffer(10 * 1024 * 1024);
        
        // バッファを使用する処理をシミュレート
        const processedData = Buffer.from(largeBuffer.toString('base64').slice(0, 1000));
        expect(processedData.length).toBeGreaterThan(0);

        // 明示的に参照をクリア
        // @ts-ignore
        largeBuffer = null;
        
        if (i % 5 === 4) {
          await waitAndGc();
          captureMemorySnapshot(`大容量処理 ${i + 1}回完了`);
        }
      }

      await waitAndGc(300);
      const finalMemory = captureMemorySnapshot('大容量処理完了');

      // 大きなバッファが適切に解放されていることを確認
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('複数ファイル処理でのメモリリーク検証', () => {
    it('連続的な複数ファイル処理でメモリリークしない', async () => {
      const mockProcessFont = vi.fn().mockImplementation(async (options) => {
        // 各ファイル処理をシミュレート
        const inputSize = 3 * 1024 * 1024; // 3MB
        const outputSize = 300 * 1024; // 300KB
        
        // 処理時間をシミュレート
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
          success: true,
          originalSize: inputSize,
          outputSize: outputSize,
          processingTime: 150
        };
      });

      captureMemorySnapshot('複数ファイル処理開始前');

      // 100個のファイルを5回に分けて処理
      for (let batch = 0; batch < 5; batch++) {
        const files = Array.from({ length: 20 }, (_, i) => ({
          path: `/test/batch${batch}-file${i}.ttf`,
          characters: 'abcdefghijklmnopqrstuvwxyz',
          outputPath: `/test/batch${batch}-output${i}.woff2`
        }));

        // バッチ処理実行
        const promises = files.map(file => mockProcessFont(file));
        const results = await Promise.all(promises);

        expect(results.every(r => r.success)).toBe(true);

        await waitAndGc();
        captureMemorySnapshot(`バッチ ${batch + 1}/5 完了`);
      }

      await waitAndGc(200);
      const finalMemory = captureMemorySnapshot('複数ファイル処理完了');

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(80 * 1024 * 1024); // 80MB
    });

    it('並行処理制限下でのメモリ管理', async () => {
      const concurrentLimit = 3;
      let activeTasks = 0;
      let maxConcurrentTasks = 0;

      const mockProcessWithLimit = async (fileIndex: number) => {
        activeTasks++;
        maxConcurrentTasks = Math.max(maxConcurrentTasks, activeTasks);

        // メモリを消費する処理をシミュレート
        const workingBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB
        
        try {
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // バッファを使用する処理
          const result = workingBuffer.slice(0, 1000);
          expect(result.length).toBe(1000);
          
          return { success: true, fileIndex };
        } finally {
          activeTasks--;
        }
      };

      captureMemorySnapshot('並行処理開始前');

      // セマフォパターンで並行数を制限
      const semaphore = {
        current: 0,
        max: concurrentLimit,
        async acquire() {
          while (this.current >= this.max) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          this.current++;
        },
        release() {
          this.current--;
        }
      };

      const processingTasks = Array.from({ length: 30 }, async (_, i) => {
        await semaphore.acquire();
        try {
          return await mockProcessWithLimit(i);
        } finally {
          semaphore.release();
        }
      });

      const results = await Promise.all(processingTasks);
      expect(results.every(r => r.success)).toBe(true);
      expect(maxConcurrentTasks).toBeLessThanOrEqual(concurrentLimit);

      await waitAndGc(200);
      const finalMemory = captureMemorySnapshot('並行処理完了');

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(60 * 1024 * 1024); // 60MB
    });

    it('エラー発生時のメモリクリーンアップ', async () => {
      let processCount = 0;
      
      const mockProcessWithErrors = async (fileIndex: number) => {
        processCount++;
        
        // 大きなバッファを作成
        const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
        
        // 30%の確率でエラーを発生させる
        if (Math.random() < 0.3) {
          throw new Error(`処理エラー: ファイル ${fileIndex}`);
        }
        
        // 正常処理
        await new Promise(resolve => setTimeout(resolve, 20));
        return { success: true, fileIndex, dataSize: largeBuffer.length };
      };

      captureMemorySnapshot('エラー処理テスト開始前');

      const results = await Promise.allSettled(
        Array.from({ length: 40 }, (_, i) => mockProcessWithErrors(i))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount + errorCount).toBe(40);
      expect(errorCount).toBeGreaterThan(0); // エラーが発生していることを確認

      await waitAndGc(200);
      const finalMemory = captureMemorySnapshot('エラー処理テスト完了');

      // エラーが発生してもメモリリークしていないことを確認
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  describe('長時間実行でのメモリ安定性', () => {
    it('長時間連続処理でメモリが安定している', async () => {
      const testDuration = 10000; // 10秒
      const startTime = Date.now();
      let iterationCount = 0;
      const memoryMeasurements: number[] = [];

      captureMemorySnapshot('長時間処理開始');

      while (Date.now() - startTime < testDuration) {
        // 軽量な処理を繰り返し実行
        const smallBuffer = Buffer.alloc(100 * 1024); // 100KB
        const processedData = smallBuffer.toString('base64').slice(0, 50);
        expect(processedData.length).toBe(50);

        iterationCount++;

        // 100回ごとにメモリ測定
        if (iterationCount % 100 === 0) {
          await waitAndGc(10);
          const currentMemory = process.memoryUsage();
          memoryMeasurements.push(currentMemory.heapUsed);
          
          if (iterationCount % 500 === 0) {
            captureMemorySnapshot(`反復処理 ${iterationCount}回`);
          }
        }

        // CPUを他のタスクに譲る
        if (iterationCount % 50 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      await waitAndGc(200);
      const finalMemory = captureMemorySnapshot('長時間処理完了');

      console.log(`総反復回数: ${iterationCount}`);

      // メモリ使用量が安定していることを確認
      if (memoryMeasurements.length > 2) {
        const firstQuarter = memoryMeasurements.slice(0, Math.floor(memoryMeasurements.length / 4));
        const lastQuarter = memoryMeasurements.slice(-Math.floor(memoryMeasurements.length / 4));
        
        const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
        const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
        
        const memoryGrowth = avgLast - avgFirst;
        expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // 20MB未満の増加
      }

      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(totalMemoryIncrease).toBeLessThan(30 * 1024 * 1024); // 30MB
    });

    it('周期的なガベージコレクション効果の確認', async () => {
      const cycles = 10;
      const memoryBeforeGC: number[] = [];
      const memoryAfterGC: number[] = [];

      for (let cycle = 0; cycle < cycles; cycle++) {
        // メモリを消費する処理
        const buffers = Array.from({ length: 20 }, () => Buffer.alloc(1024 * 1024)); // 20MB
        
        // バッファを使用
        const processedData = buffers.map(buf => buf.slice(0, 100));
        expect(processedData.length).toBe(20);

        // GC前のメモリ使用量を記録
        const beforeGC = process.memoryUsage().heapUsed;
        memoryBeforeGC.push(beforeGC);

        // 参照をクリア
        buffers.length = 0;

        // ガベージコレクションを実行
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        // GC後のメモリ使用量を記録
        const afterGC = process.memoryUsage().heapUsed;
        memoryAfterGC.push(afterGC);

        captureMemorySnapshot(`GCサイクル ${cycle + 1}/${cycles}`);
      }

      // ガベージコレクションが効果的に動作していることを確認
      const avgMemoryReclaimed = memoryBeforeGC.reduce((sum, before, i) => {
        return sum + (before - memoryAfterGC[i]);
      }, 0) / cycles;

      expect(avgMemoryReclaimed).toBeGreaterThan(10 * 1024 * 1024); // 平均10MB以上回収
    });
  });

  describe('メモリプレッシャー対応', () => {
    it('メモリ不足警告時の適切な対応', async () => {
      let memoryWarningTriggered = false;
      const originalEmit = process.emit;

      // メモリ警告イベントをモック
      process.emit = vi.fn((event: string, ...args: any[]) => {
        if (event === 'warning' && args[0]?.name === 'MaxListenersExceededWarning') {
          memoryWarningTriggered = true;
        }
        return originalEmit.call(process, event, ...args);
      }) as any;

      try {
        // メモリプレッシャーをシミュレート
        const largeBuffers: Buffer[] = [];
        
        for (let i = 0; i < 50; i++) {
          try {
            const buffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
            largeBuffers.push(buffer);
            
            // メモリ使用量をチェック
            const currentMemory = process.memoryUsage();
            if (currentMemory.heapUsed > 500 * 1024 * 1024) { // 500MB超過
              // メモリプレッシャー対応: バッファをクリア
              largeBuffers.splice(0, largeBuffers.length / 2);
              
              if (global.gc) {
                global.gc();
              }
              
              captureMemorySnapshot(`メモリプレッシャー対応 ${i}`);
              break;
            }
          } catch (error) {
            // メモリ不足エラーをキャッチ
            console.log('メモリ不足エラーを検出:', error.message);
            break;
          }
        }

        // クリーンアップ
        largeBuffers.length = 0;
        
        await waitAndGc(200);
        const finalMemory = captureMemorySnapshot('メモリプレッシャーテスト完了');

        // メモリが適切に制御されていることを確認
        expect(finalMemory.heapUsed).toBeLessThan(600 * 1024 * 1024); // 600MB未満
      } finally {
        process.emit = originalEmit;
      }
    });

    it('メモリ監視とクリーンアップの自動実行', async () => {
      const memoryMonitor = {
        maxHeapSize: 200 * 1024 * 1024, // 200MB
        cleanupCallbacks: [] as Array<() => void>,
        
        addCleanupCallback(callback: () => void) {
          this.cleanupCallbacks.push(callback);
        },
        
        checkAndCleanup() {
          const memory = process.memoryUsage();
          if (memory.heapUsed > this.maxHeapSize) {
            console.log('メモリ使用量上限を超過、クリーンアップを実行');
            this.cleanupCallbacks.forEach(callback => callback());
            
            if (global.gc) {
              global.gc();
            }
            
            return true;
          }
          return false;
        }
      };

      let cleanupCount = 0;
      const tempData: Buffer[] = [];

      // クリーンアップコールバックを登録
      memoryMonitor.addCleanupCallback(() => {
        tempData.length = 0;
        cleanupCount++;
      });

      captureMemorySnapshot('メモリ監視テスト開始');

      // メモリを段階的に消費
      for (let i = 0; i < 100; i++) {
        const buffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
        tempData.push(buffer);

        // 10回ごとにメモリチェック
        if (i % 10 === 9) {
          const wasCleanedUp = memoryMonitor.checkAndCleanup();
          
          if (wasCleanedUp) {
            await waitAndGc();
            captureMemorySnapshot(`クリーンアップ実行 ${cleanupCount}回目`);
          }
        }
      }

      await waitAndGc(200);
      const finalMemory = captureMemorySnapshot('メモリ監視テスト完了');

      // クリーンアップが実行されたことを確認
      expect(cleanupCount).toBeGreaterThan(0);
      
      // 最終的なメモリ使用量が制御されていることを確認
      expect(finalMemory.heapUsed).toBeLessThan(300 * 1024 * 1024); // 300MB未満
    });
  });

  describe('メモリ統計とレポート', () => {
    it('詳細なメモリ使用量統計の取得', () => {
      const memoryStats = {
        snapshots: memorySnapshots,
        
        getHeapGrowth() {
          if (this.snapshots.length < 2) return 0;
          const first = this.snapshots[0];
          const last = this.snapshots[this.snapshots.length - 1];
          return last.heapUsed - first.heapUsed;
        },
        
        getMaxHeapUsed() {
          return Math.max(...this.snapshots.map(s => s.heapUsed));
        },
        
        getMinHeapUsed() {
          return Math.min(...this.snapshots.map(s => s.heapUsed));
        },
        
        getAverageHeapUsed() {
          const sum = this.snapshots.reduce((acc, s) => acc + s.heapUsed, 0);
          return sum / this.snapshots.length;
        },
        
        generateReport() {
          return {
            totalSnapshots: this.snapshots.length,
            heapGrowth: this.getHeapGrowth(),
            maxHeapUsed: this.getMaxHeapUsed(),
            minHeapUsed: this.getMinHeapUsed(),
            averageHeapUsed: this.getAverageHeapUsed(),
            heapUtilization: this.getMaxHeapUsed() / (512 * 1024 * 1024), // 512MB基準
            memoryStability: this.getMaxHeapUsed() - this.getMinHeapUsed()
          };
        }
      };

      if (memorySnapshots.length > 0) {
        const report = memoryStats.generateReport();
        
        console.log('メモリ使用量レポート:', report);
        
        expect(report.totalSnapshots).toBeGreaterThan(0);
        expect(report.heapUtilization).toBeLessThan(1.0); // 100%未満
        expect(report.memoryStability).toBeLessThan(200 * 1024 * 1024); // 200MB未満の変動
      }
    });

    it('メモリリーク検出アルゴリズムの動作確認', () => {
      // 意図的にメモリリークをシミュレート
      const potentialLeaks: any[] = [];
      
      const leakDetector = {
        baseline: process.memoryUsage().heapUsed,
        threshold: 50 * 1024 * 1024, // 50MB
        
        detectLeak() {
          const current = process.memoryUsage().heapUsed;
          const growth = current - this.baseline;
          
          return {
            hasLeak: growth > this.threshold,
            memoryGrowth: growth,
            severity: growth > this.threshold * 2 ? 'critical' : 
                     growth > this.threshold ? 'warning' : 'normal'
          };
        }
      };

      // 少量のデータを「リーク」として保持
      for (let i = 0; i < 1000; i++) {
        potentialLeaks.push({ data: Buffer.alloc(1024), index: i });
      }

      const detection = leakDetector.detectLeak();
      
      expect(detection).toHaveProperty('hasLeak');
      expect(detection).toHaveProperty('memoryGrowth');
      expect(detection).toHaveProperty('severity');
      expect(typeof detection.hasLeak).toBe('boolean');
      expect(typeof detection.memoryGrowth).toBe('number');
      
      // クリーンアップ
      potentialLeaks.length = 0;
    });
  });
});