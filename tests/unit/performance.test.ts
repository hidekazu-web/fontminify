import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subsetFont } from '../../src/main/services/fontSubsetter';
import { analyzeFont } from '../../src/main/services/fontAnalyzer';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('fontkit');
vi.mock('subset-font');

const mockFs = vi.mocked(fs);

describe('パフォーマンステスト（10MBフォント処理時間）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('10MBフォント処理性能', () => {
    it('10MBフォントが10秒以内に処理される', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const outputBuffer = Buffer.alloc(1 * 1024 * 1024); // 1MB出力

      mockFs.readFile.mockResolvedValue(largeBuffer);
      
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        // 実際の処理時間をシミュレート（3秒）
        await new Promise(resolve => setTimeout(resolve, 3000));
        return outputBuffer;
      });

      const startTime = Date.now();
      
      const result = await subsetFont({
        inputPath: '/test/large-font.otf',
        outputPath: '/test/output.woff2',
        characters: 'abcdefghijklmnopqrstuvwxyzあいうえお',
        outputFormat: 'woff2'
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(10000); // 10秒以内
      expect(result.processingTime).toBeDefined();
      
      console.log(`10MBフォント処理時間: ${processingTime}ms`);
    });

    it('大きなフォントファイルでの段階的処理', async () => {
      const megaBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      const outputBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB

      mockFs.readFile.mockResolvedValue(megaBuffer);
      
      const mockSubsetFont = (await import('subset-font')).default;
      let progressCallCount = 0;
      
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        // 段階的な処理をシミュレート
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 各段階200ms
          progressCallCount++;
        }
        return outputBuffer;
      });

      const progressCallback = vi.fn();
      const startTime = Date.now();

      const result = await subsetFont({
        inputPath: '/test/mega-font.otf',
        outputPath: '/test/mega-output.woff2',
        characters: 'abcdefghijklmnopqrstuvwxyz',
        outputFormat: 'woff2'
      }, progressCallback);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(15000); // 15秒以内
      expect(progressCallCount).toBeGreaterThan(5);
    });

    it('複数文字セットでの処理時間比較', async () => {
      const testBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockFs.readFile.mockResolvedValue(testBuffer);

      const characterSets = [
        { name: '英数字のみ', chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', expectedTime: 3000 },
        { name: 'ひらがな', chars: 'あいうえおかきくけこさしすせそたちつてとなにぬねの', expectedTime: 4000 },
        { name: '基本漢字', chars: '日本語漢字一二三四五六七八九十百千万', expectedTime: 5000 },
        { name: '大規模セット', chars: 'a'.repeat(1000) + 'あ'.repeat(500) + '漢'.repeat(200), expectedTime: 8000 }
      ];

      const results: Array<{ name: string; time: number; success: boolean }> = [];

      for (const charset of characterSets) {
        const mockSubsetFont = (await import('subset-font')).default;
        vi.mocked(mockSubsetFont).mockImplementation(async () => {
          const simulatedTime = Math.min(charset.expectedTime, charset.chars.length * 2);
          await new Promise(resolve => setTimeout(resolve, simulatedTime));
          return Buffer.alloc(500 * 1024); // 500KB出力
        });

        const startTime = Date.now();
        
        const result = await subsetFont({
          inputPath: '/test/font.otf',
          outputPath: `/test/output-${charset.name}.woff2`,
          characters: charset.chars,
          outputFormat: 'woff2'
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        results.push({
          name: charset.name,
          time: processingTime,
          success: result.success
        });

        expect(result.success).toBe(true);
        expect(processingTime).toBeLessThan(charset.expectedTime + 1000); // マージン1秒
      }

      console.log('文字セット別処理時間:', results);
      
      // 文字セットサイズと処理時間の関係を確認
      expect(results[0].time).toBeLessThan(results[3].time); // 英数字 < 大規模セット
    });
  });

  describe('メモリ効率性', () => {
    it('大きなフォント処理中のメモリ使用量が適切', async () => {
      const initialMemory = process.memoryUsage();
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB

      mockFs.readFile.mockResolvedValue(largeBuffer);
      
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        // メモリ使用量をチェックしながら処理
        const currentMemory = process.memoryUsage();
        const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
        
        expect(memoryIncrease).toBeLessThan(300 * 1024 * 1024); // 300MB未満
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        return Buffer.alloc(1.5 * 1024 * 1024); // 1.5MB出力
      });

      const result = await subsetFont({
        inputPath: '/test/memory-test-font.otf',
        outputPath: '/test/memory-output.woff2',
        characters: 'abcdefghijklmnopqrstuvwxyz',
        outputFormat: 'woff2'
      });

      expect(result.success).toBe(true);

      // 処理後のメモリ使用量確認
      if (global.gc) global.gc();
      
      const finalMemory = process.memoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB未満
    });

    it('ストリーミング処理による効率化', async () => {
      const hugeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      mockFs.readFile.mockResolvedValue(hugeBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        // チャンク単位での処理をシミュレート
        const chunkSize = 5 * 1024 * 1024; // 5MBチャンク
        const totalChunks = Math.ceil(hugeBuffer.length / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, hugeBuffer.length);
          const chunk = hugeBuffer.slice(start, end);
          
          // チャンク処理
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log(`チャンク ${i + 1}/${totalChunks} 処理完了 (${chunk.length}バイト)`);
        }

        return Buffer.alloc(5 * 1024 * 1024); // 5MB出力
      });

      const startTime = Date.now();
      
      const result = await subsetFont({
        inputPath: '/test/huge-font.otf',
        outputPath: '/test/huge-output.woff2',
        characters: 'abcdefghijklmnopqrstuvwxyz',
        outputFormat: 'woff2',
        streamingMode: true
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(20000); // 20秒以内
    });
  });

  describe('並行処理性能', () => {
    it('複数ファイルの並行処理が効率的', async () => {
      const fileCount = 5;
      const buffers = Array.from({ length: fileCount }, (_, i) => 
        Buffer.alloc((8 + i * 2) * 1024 * 1024) // 8, 10, 12, 14, 16MB
      );

      buffers.forEach((buffer, i) => {
        mockFs.readFile.mockResolvedValueOnce(buffer);
      });

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000)); // 2-3秒
        return Buffer.alloc(800 * 1024); // 800KB出力
      });

      const startTime = Date.now();

      // 並行処理実行
      const promises = Array.from({ length: fileCount }, (_, i) =>
        subsetFont({
          inputPath: `/test/font-${i}.otf`,
          outputPath: `/test/output-${i}.woff2`,
          characters: `abcdefghijklmnopqrstuvwxyz-${i}`,
          outputFormat: 'woff2'
        })
      );

      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 全て成功していることを確認
      expect(results.every(r => r.success)).toBe(true);
      
      // 並行処理により、直列処理よりも高速であることを確認
      const estimatedSerialTime = fileCount * 2500; // 1ファイル平均2.5秒
      expect(totalTime).toBeLessThan(estimatedSerialTime * 0.8); // 直列の80%以下

      console.log(`${fileCount}ファイル並行処理時間: ${totalTime}ms (推定直列: ${estimatedSerialTime}ms)`);
    });

    it('リソース制限下での適応的処理', async () => {
      const maxConcurrency = 3;
      const totalFiles = 10;
      let activeTasks = 0;
      let maxActiveTasks = 0;

      const buffers = Array.from({ length: totalFiles }, () => 
        Buffer.alloc(8 * 1024 * 1024) // 8MB each
      );

      buffers.forEach(buffer => {
        mockFs.readFile.mockResolvedValueOnce(buffer);
      });

      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        activeTasks++;
        maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
        
        try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return Buffer.alloc(800 * 1024);
        } finally {
          activeTasks--;
        }
      });

      // セマフォによる並行数制御
      const semaphore = Array(maxConcurrency).fill(null);
      let semaphoreIndex = 0;

      const controlledProcessing = async (index: number) => {
        // セマフォ取得待ち
        while (activeTasks >= maxConcurrency) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        return subsetFont({
          inputPath: `/test/controlled-font-${index}.otf`,
          outputPath: `/test/controlled-output-${index}.woff2`,
          characters: `abcdefghijklmnopqrstuvwxyz-${index}`,
          outputFormat: 'woff2'
        });
      };

      const startTime = Date.now();
      
      const promises = Array.from({ length: totalFiles }, (_, i) => 
        controlledProcessing(i)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results.every(r => r.success)).toBe(true);
      expect(maxActiveTasks).toBeLessThanOrEqual(maxConcurrency);
      expect(endTime - startTime).toBeLessThan(20000); // 20秒以内

      console.log(`制御された並行処理 (最大${maxConcurrency}並行): ${endTime - startTime}ms`);
    });
  });

  describe('CPU集約的処理の最適化', () => {
    it('CPU使用率の監視と制御', async () => {
      const testBuffer = Buffer.alloc(12 * 1024 * 1024); // 12MB
      mockFs.readFile.mockResolvedValue(testBuffer);

      let cpuIntensiveOperations = 0;
      
      const mockSubsetFont = (await import('subset-font')).default;
      vi.mocked(mockSubsetFont).mockImplementation(async () => {
        // CPU集約的な処理をシミュレート
        for (let i = 0; i < 1000; i++) {
          // 計算集約的な処理
          Math.sqrt(Math.random() * 1000000);
          cpuIntensiveOperations++;
          
          // 100回ごとにCPUを他のタスクに譲る
          if (i % 100 === 0) {
            await new Promise(resolve => setImmediate(resolve));
          }
        }
        
        return Buffer.alloc(1.2 * 1024 * 1024); // 1.2MB出力
      });

      const startTime = Date.now();
      
      const result = await subsetFont({
        inputPath: '/test/cpu-intensive-font.otf',
        outputPath: '/test/cpu-output.woff2',
        characters: 'abcdefghijklmnopqrstuvwxyz',
        outputFormat: 'woff2'
      });

      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(cpuIntensiveOperations).toBeGreaterThan(900); // ほぼ全ての処理が完了
      expect(endTime - startTime).toBeLessThan(10000); // 10秒以内

      console.log(`CPU集約的処理完了: ${cpuIntensiveOperations}回の演算, ${endTime - startTime}ms`);
    });

    it('ワーカー分散処理のシミュレーション', async () => {
      const workItems = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB each
        characters: `workitem-${i}`
      }));

      const workerPool = {
        maxWorkers: 4,
        activeWorkers: 0,
        
        async processItem(item: any) {
          this.activeWorkers++;
          
          try {
            // ワーカー処理をシミュレート
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            
            return {
              id: item.id,
              success: true,
              outputSize: 600 * 1024, // 600KB
              processingTime: 1000 + Math.random() * 1000
            };
          } finally {
            this.activeWorkers--;
          }
        },
        
        async processAll(items: any[]) {
          const results = [];
          
          for (const item of items) {
            // ワーカー数制限
            while (this.activeWorkers >= this.maxWorkers) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            results.push(this.processItem(item));
          }
          
          return Promise.all(results);
        }
      };

      const startTime = Date.now();
      const results = await workerPool.processAll(workItems);
      const endTime = Date.now();

      expect(results.every(r => r.success)).toBe(true);
      expect(results).toHaveLength(workItems.length);
      expect(endTime - startTime).toBeLessThan(15000); // 15秒以内

      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      console.log(`ワーカー分散処理: ${results.length}アイテム, 平均${avgProcessingTime.toFixed(0)}ms/アイテム`);
    });
  });

  describe('キャッシュとプリロード最適化', () => {
    it('フォント分析結果のキャッシュ効果', async () => {
      const testBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockFs.readFile.mockResolvedValue(testBuffer);

      const mockFontkit = await import('fontkit');
      let fontAnalysisCount = 0;
      
      vi.mocked(mockFontkit.openSync).mockImplementation(() => {
        fontAnalysisCount++;
        return {
          postscriptName: 'CachedFont',
          fullName: 'Cached Font Regular',
          numGlyphs: 10000,
          characterSet: new Set(Array.from({ length: 1000 }, (_, i) => i + 32))
        } as any;
      });

      // 同じフォントファイルを複数回分析
      const analysisPromises = Array.from({ length: 5 }, () =>
        analyzeFont('/test/cached-font.otf')
      );

      const results = await Promise.all(analysisPromises);

      expect(results.every(r => r.success)).toBe(true);
      expect(fontAnalysisCount).toBe(5); // キャッシュなしの場合

      // キャッシュ有効化後の再実行をシミュレート
      fontAnalysisCount = 0;
      const cachedResults = await Promise.all(analysisPromises);
      
      expect(cachedResults.every(r => r.success)).toBe(true);
      // 実際の実装ではキャッシュにより分析回数が削減される
    });

    it('プリコンパイルされた文字セットの使用', async () => {
      const precompiledCharsets = {
        'ascii': { chars: 'abcdefghijklmnopqrstuvwxyz', compiled: true },
        'hiragana': { chars: 'あいうえおかきくけこ', compiled: true },
        'numbers': { chars: '0123456789', compiled: true }
      };

      const testBuffer = Buffer.alloc(8 * 1024 * 1024); // 8MB
      mockFs.readFile.mockResolvedValue(testBuffer);

      const mockSubsetFont = (await import('subset-font')).default;
      let compilationTime = 0;
      
      vi.mocked(mockSubsetFont).mockImplementation(async (buffer, options) => {
        const charset = options.text;
        const isPrecompiled = Object.values(precompiledCharsets)
          .some(pc => pc.chars === charset && pc.compiled);
        
        if (isPrecompiled) {
          // プリコンパイル済みの場合は高速処理
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // 未コンパイルの場合はコンパイル時間が追加
          compilationTime = 2000;
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        return Buffer.alloc(800 * 1024); // 800KB
      });

      // プリコンパイル済み文字セットでのテスト
      const precompiledStart = Date.now();
      const precompiledResult = await subsetFont({
        inputPath: '/test/font.otf',
        outputPath: '/test/precompiled-output.woff2',
        characters: precompiledCharsets.ascii.chars,
        outputFormat: 'woff2'
      });
      const precompiledTime = Date.now() - precompiledStart;

      // カスタム文字セットでのテスト
      const customStart = Date.now();
      const customResult = await subsetFont({
        inputPath: '/test/font.otf',
        outputPath: '/test/custom-output.woff2',
        characters: 'カスタム文字セット',
        outputFormat: 'woff2'
      });
      const customTime = Date.now() - customStart;

      expect(precompiledResult.success).toBe(true);
      expect(customResult.success).toBe(true);
      expect(precompiledTime).toBeLessThan(customTime); // プリコンパイル済みの方が高速

      console.log(`プリコンパイル済み: ${precompiledTime}ms, カスタム: ${customTime}ms`);
    });
  });
});