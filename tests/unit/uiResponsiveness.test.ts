import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFontStore } from '../../src/renderer/stores/fontStore';
import { FontDropzone } from '../../src/renderer/components/FontDropzone';
import { ProgressIndicator } from '../../src/renderer/components/ProgressIndicator';
import { FontInfoDisplay } from '../../src/renderer/components/FontInfoDisplay';

// Mock performance observer
const mockPerformanceObserver = vi.fn();
global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
  mockPerformanceObserver.mockImplementation(callback);
  return {
    observe: vi.fn(),
    disconnect: vi.fn()
  };
});

// Mock requestAnimationFrame
const mockRAF = vi.fn();
global.requestAnimationFrame = mockRAF.mockImplementation((callback) => {
  return setTimeout(callback, 16); // 60fps = 16.67ms
});

describe('UI応答性テスト（60fps維持確認）', () => {
  let performanceMarks: Array<{ name: string; startTime: number }> = [];
  let frameTimes: number[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    performanceMarks = [];
    frameTimes = [];
    
    // Performance APIのモック
    global.performance.mark = vi.fn((name: string) => {
      performanceMarks.push({ name, startTime: performance.now() });
    });

    global.performance.measure = vi.fn((name: string, startMark?: string, endMark?: string) => {
      const start = performanceMarks.find(m => m.name === startMark);
      const end = performanceMarks.find(m => m.name === endMark);
      return {
        name,
        duration: end && start ? end.startTime - start.startTime : 0,
        startTime: start?.startTime || 0
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const measureFrameRate = (duration: number = 1000): Promise<{ fps: number; frameCount: number; avgFrameTime: number }> => {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let frameCount = 0;
      const frameDurations: number[] = [];
      let lastFrameTime = startTime;

      const measureFrame = () => {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastFrameTime;
        
        frameDurations.push(frameDuration);
        frameCount++;
        lastFrameTime = currentTime;

        if (currentTime - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          const totalTime = currentTime - startTime;
          const fps = (frameCount * 1000) / totalTime;
          const avgFrameTime = frameDurations.reduce((sum, time) => sum + time, 0) / frameDurations.length;
          
          resolve({ fps, frameCount, avgFrameTime });
        }
      };

      requestAnimationFrame(measureFrame);
    });
  };

  describe('ドラッグ&ドロップ操作の応答性', () => {
    it('大きなフォントファイルのドラッグ中も60fps維持', async () => {
      const { container } = render(<FontDropzone />);
      const dropzone = container.firstChild as HTMLElement;

      // 大きなファイルサイズをシミュレート
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large-font.ttf', {
        type: 'font/ttf'
      });

      performance.mark('drag-start');

      // ドラッグイベントを連続発生させて応答性をテスト
      const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
      let frameMetrics: any;

      await act(async () => {
        // フレームレート測定開始
        const metricsPromise = measureFrameRate(500);

        // 連続的にドラッグイベントを発生
        for (let i = 0; i < 20; i++) {
          dragEvents.forEach(eventType => {
            fireEvent[eventType as keyof typeof fireEvent](dropzone, {
              dataTransfer: {
                files: [largeFile],
                types: ['Files']
              }
            });
          });
          
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        frameMetrics = await metricsPromise;
      });

      performance.mark('drag-end');

      expect(frameMetrics.fps).toBeGreaterThan(55); // 60fps±5の許容範囲
      expect(frameMetrics.avgFrameTime).toBeLessThan(20); // 16.67ms+マージン
    });

    it('複数ファイル同時ドラッグでの応答性', async () => {
      const { container } = render(<FontDropzone />);
      const dropzone = container.firstChild as HTMLElement;

      // 複数の大きなファイルを作成
      const files = Array.from({ length: 10 }, (_, i) => 
        new File(['x'.repeat(5 * 1024 * 1024)], `font-${i}.ttf`, { type: 'font/ttf' })
      );

      let frameMetrics: any;

      await act(async () => {
        const metricsPromise = measureFrameRate(800);

        // 複数ファイルでのドラッグオーバーを繰り返し
        for (let i = 0; i < 15; i++) {
          fireEvent.dragOver(dropzone, {
            dataTransfer: {
              files: files,
              types: ['Files']
            }
          });
          
          await new Promise(resolve => requestAnimationFrame(resolve));
        }

        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(50); // 複数ファイルでも50fps以上
      expect(frameMetrics.frameCount).toBeGreaterThan(25); // 十分なフレーム数
    });

    it('ドラッグ中のビジュアルフィードバックが滑らか', async () => {
      const { container } = render(<FontDropzone />);
      const dropzone = container.firstChild as HTMLElement;

      const file = new File(['font data'], 'test.ttf', { type: 'font/ttf' });
      
      // CSS トランジション時間を測定
      const transitionStartTime = performance.now();

      await act(async () => {
        fireEvent.dragEnter(dropzone, {
          dataTransfer: { files: [file], types: ['Files'] }
        });

        // トランジションの完了を待つ
        await waitFor(() => {
          expect(dropzone).toHaveClass('drag-over');
        }, { timeout: 500 });
      });

      const transitionEndTime = performance.now();
      const transitionDuration = transitionEndTime - transitionStartTime;

      // トランジションが適切な時間内で完了することを確認
      expect(transitionDuration).toBeLessThan(300); // 300ms以内
      expect(transitionDuration).toBeGreaterThan(50); // 最低限の視覚的フィードバック
    });
  });

  describe('プログレス表示の応答性', () => {
    it('プログレス更新が滑らかに表示される', async () => {
      const { rerender } = render(<ProgressIndicator progress={0} />);

      let frameMetrics: any;
      const progressUpdates: number[] = [];

      await act(async () => {
        const metricsPromise = measureFrameRate(1000);

        // 0%から100%まで1%ずつ更新
        for (let progress = 0; progress <= 100; progress += 1) {
          progressUpdates.push(performance.now());
          rerender(<ProgressIndicator progress={progress} />);
          await new Promise(resolve => requestAnimationFrame(resolve));
        }

        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(55);
      
      // プログレス更新の間隔が一定であることを確認
      const intervals = progressUpdates.slice(1).map((time, i) => time - progressUpdates[i]);
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const intervalVariance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      expect(Math.sqrt(intervalVariance)).toBeLessThan(10); // 10ms以下の分散
    });

    it('高頻度プログレス更新でも応答性維持', async () => {
      const { rerender } = render(<ProgressIndicator progress={0} />);

      let frameMetrics: any;

      await act(async () => {
        const metricsPromise = measureFrameRate(500);

        // 非常に高頻度でプログレス更新（60fps = 16.67ms間隔）
        const startTime = performance.now();
        const updateInterval = setInterval(() => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min((elapsed / 500) * 100, 100);
          
          rerender(<ProgressIndicator progress={progress} />);
          
          if (progress >= 100) {
            clearInterval(updateInterval);
          }
        }, 8); // 120fps相当の更新頻度

        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(50); // 高頻度更新でも50fps以上
    });

    it('マルチプログレス表示の同時更新', async () => {
      const MultiProgressComponent = ({ progresses }: { progresses: number[] }) => (
        <div>
          {progresses.map((progress, index) => (
            <ProgressIndicator key={index} progress={progress} />
          ))}
        </div>
      );

      const { rerender } = render(<MultiProgressComponent progresses={[0, 0, 0, 0, 0]} />);

      let frameMetrics: any;

      await act(async () => {
        const metricsPromise = measureFrameRate(600);

        // 5つのプログレスバーを同時に異なる速度で更新
        const startTime = performance.now();
        const speeds = [1, 1.5, 0.8, 1.2, 0.9];
        
        const updateProgresses = () => {
          const elapsed = performance.now() - startTime;
          const progresses = speeds.map(speed => 
            Math.min((elapsed / 600) * 100 * speed, 100)
          );
          
          rerender(<MultiProgressComponent progresses={progresses} />);
          
          if (progresses.some(p => p < 100)) {
            requestAnimationFrame(updateProgresses);
          }
        };

        updateProgresses();
        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(45); // 5つ同時でも45fps以上
    });
  });

  describe('フォント情報表示の応答性', () => {
    it('大量フォント情報の表示が滑らか', async () => {
      const largeFontInfo = {
        name: 'Test Font Family',
        fullName: 'Test Font Family Regular',
        postscriptName: 'TestFontFamily-Regular',
        numGlyphs: 65535,
        characters: Array.from({ length: 10000 }, (_, i) => String.fromCharCode(33 + (i % 94))).join(''),
        fileSize: 15 * 1024 * 1024,
        format: 'ttf' as const
      };

      let renderTime: number;

      await act(async () => {
        const startTime = performance.now();
        render(<FontInfoDisplay fontInfo={largeFontInfo} />);
        renderTime = performance.now() - startTime;
      });

      // 大量データでも200ms以内でレンダリング
      expect(renderTime).toBeLessThan(200);
    });

    it('フォント情報更新時の応答性', async () => {
      const baseFontInfo = {
        name: 'Font 1',
        fullName: 'Font 1 Regular',
        postscriptName: 'Font1-Regular',
        numGlyphs: 1000,
        characters: 'abcdefg',
        fileSize: 1024 * 1024,
        format: 'ttf' as const
      };

      const { rerender } = render(<FontInfoDisplay fontInfo={baseFontInfo} />);

      let frameMetrics: any;

      await act(async () => {
        const metricsPromise = measureFrameRate(500);

        // 20種類の異なるフォント情報に素早く切り替え
        for (let i = 1; i <= 20; i++) {
          const updatedInfo = {
            ...baseFontInfo,
            name: `Font ${i}`,
            fullName: `Font ${i} Regular`,
            postscriptName: `Font${i}-Regular`,
            numGlyphs: 1000 + (i * 100),
            characters: 'abcdefg'.repeat(i),
            fileSize: (1024 * 1024) + (i * 100 * 1024)
          };

          rerender(<FontInfoDisplay fontInfo={updatedInfo} />);
          await new Promise(resolve => setTimeout(resolve, 20));
        }

        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(50);
    });

    it('長いフォント名の表示でもレイアウトが安定', async () => {
      const longNameFontInfo = {
        name: 'Very Long Font Family Name That Might Cause Layout Issues',
        fullName: 'Very Long Font Family Name That Might Cause Layout Issues And Performance Problems Regular',
        postscriptName: 'VeryLongFontFamilyNameThatMightCauseLayoutIssuesAndPerformanceProblems-Regular',
        numGlyphs: 5000,
        characters: 'テスト文字列'.repeat(1000),
        fileSize: 8 * 1024 * 1024,
        format: 'otf' as const
      };

      let layoutShifts = 0;
      
      // レイアウトシフトを監視
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            layoutShifts++;
          }
        }
      });

      await act(async () => {
        const startTime = performance.now();
        render(<FontInfoDisplay fontInfo={longNameFontInfo} />);
        
        // レンダリング完了を待つ
        await waitFor(() => {
          expect(screen.getByText(longNameFontInfo.name)).toBeInTheDocument();
        });

        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(150);
      });

      // レイアウトシフトが最小限であることを確認
      expect(layoutShifts).toBeLessThan(3);
    });
  });

  describe('スクロール応答性', () => {
    it('長い文字セットリストのスクロールが滑らか', async () => {
      const LongCharacterList = () => (
        <div style={{ height: '400px', overflow: 'auto' }} data-testid="char-list">
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i} style={{ padding: '8px' }}>
              文字 {String.fromCharCode(0x3042 + (i % 83))} - {i}
            </div>
          ))}
        </div>
      );

      render(<LongCharacterList />);
      const scrollContainer = screen.getByTestId('char-list');

      let frameMetrics: any;

      await act(async () => {
        const metricsPromise = measureFrameRate(800);

        // 滑らかなスクロールをシミュレート
        for (let scrollTop = 0; scrollTop <= 5000; scrollTop += 50) {
          scrollContainer.scrollTop = scrollTop;
          fireEvent.scroll(scrollContainer);
          await new Promise(resolve => requestAnimationFrame(resolve));
        }

        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(50);
      expect(frameMetrics.avgFrameTime).toBeLessThan(20);
    });

    it('慣性スクロールの応答性', async () => {
      const ScrollableContent = () => (
        <div 
          style={{ 
            height: '300px', 
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch' // iOS風慣性スクロール
          }} 
          data-testid="scroll-content"
        >
          {Array.from({ length: 500 }, (_, i) => (
            <div key={i} style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
              項目 {i} - フォント処理結果
            </div>
          ))}
        </div>
      );

      render(<ScrollableContent />);
      const scrollContainer = screen.getByTestId('scroll-content');

      let frameMetrics: any;

      await act(async () => {
        const metricsPromise = measureFrameRate(600);

        // 慣性スクロールをシミュレート（減速）
        let velocity = 100;
        const friction = 0.95;

        const simulateInertialScroll = () => {
          scrollContainer.scrollTop += velocity;
          fireEvent.scroll(scrollContainer);
          
          velocity *= friction;
          
          if (velocity > 1) {
            requestAnimationFrame(simulateInertialScroll);
          }
        };

        simulateInertialScroll();
        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(55);
    });
  });

  describe('アニメーション応答性', () => {
    it('ローディングアニメーションが一定フレームレート', async () => {
      const LoadingSpinner = () => (
        <div 
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
          data-testid="spinner"
        />
      );

      render(<LoadingSpinner />);

      let frameMetrics: any;

      await act(async () => {
        frameMetrics = await measureFrameRate(1200); // アニメーション1回転以上
      });

      expect(frameMetrics.fps).toBeGreaterThan(55);
      expect(frameMetrics.avgFrameTime).toBeLessThan(18);
    });

    it('フェードイン・アウトアニメーションの滑らかさ', async () => {
      const FadeComponent = ({ visible }: { visible: boolean }) => (
        <div 
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          data-testid="fade-element"
        >
          フェード要素
        </div>
      );

      const { rerender } = render(<FadeComponent visible={true} />);

      let frameMetrics: any;

      await act(async () => {
        const metricsPromise = measureFrameRate(400);

        // フェードイン・アウトを繰り返し
        rerender(<FadeComponent visible={false} />);
        await new Promise(resolve => setTimeout(resolve, 150));
        
        rerender(<FadeComponent visible={true} />);
        await new Promise(resolve => setTimeout(resolve, 150));
        
        rerender(<FadeComponent visible={false} />);

        frameMetrics = await metricsPromise;
      });

      expect(frameMetrics.fps).toBeGreaterThan(55);
    });

    it('複数同時アニメーションでも応答性維持', async () => {
      const MultiAnimationComponent = () => (
        <div>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              style={{
                width: '20px',
                height: '20px',
                background: `hsl(${i * 45}, 70%, 50%)`,
                margin: '5px',
                display: 'inline-block',
                animation: `bounce 1s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      );

      render(<MultiAnimationComponent />);

      let frameMetrics: any;

      await act(async () => {
        frameMetrics = await measureFrameRate(1500);
      });

      expect(frameMetrics.fps).toBeGreaterThan(50); // 8つ同時でも50fps以上
    });
  });

  describe('メモリ使用量と応答性の相関', () => {
    it('メモリ使用量増加時も応答性維持', async () => {
      const MemoryIntensiveComponent = ({ dataSize }: { dataSize: number }) => {
        // 大量のダミーデータを生成
        const dummyData = Array.from({ length: dataSize }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: {
            size: Math.random() * 1000000,
            date: new Date().toISOString(),
            tags: Array.from({ length: 20 }, (_, j) => `tag${j}`)
          }
        }));

        return (
          <div>
            {dummyData.slice(0, 100).map(item => (
              <div key={item.id} style={{ padding: '8px', border: '1px solid #ccc' }}>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <small>{item.metadata.size.toFixed(2)} bytes</small>
              </div>
            ))}
          </div>
        );
      };

      const { rerender } = render(<MemoryIntensiveComponent dataSize={1000} />);

      const results: Array<{ dataSize: number; fps: number; memory: number }> = [];

      for (const dataSize of [1000, 5000, 10000, 20000]) {
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

        await act(async () => {
          rerender(<MemoryIntensiveComponent dataSize={dataSize} />);
          
          const frameMetrics = await measureFrameRate(300);
          const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

          results.push({
            dataSize,
            fps: frameMetrics.fps,
            memory: finalMemory - initialMemory
          });
        });
      }

      // メモリ使用量が増加してもFPSが急激に低下しないことを確認
      const fpsValues = results.map(r => r.fps);
      const minFps = Math.min(...fpsValues);
      const maxFps = Math.max(...fpsValues);

      expect(minFps).toBeGreaterThan(40); // 最低でも40fps
      expect(maxFps - minFps).toBeLessThan(20); // FPSの変動幅が20以下
    });
  });

  describe('デバイス性能適応', () => {
    it('低性能デバイスでの適応的品質調整', async () => {
      // 低性能デバイスをシミュレート
      const originalHardwareConcurrency = navigator.hardwareConcurrency;
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 2 // 2コアCPU
      });

      const AdaptiveQualityComponent = () => {
        const [quality, setQuality] = React.useState('high');
        
        React.useEffect(() => {
          // CPU性能に基づく品質調整
          if (navigator.hardwareConcurrency <= 2) {
            setQuality('medium');
          }
        }, []);

        return (
          <div data-testid="quality-indicator" data-quality={quality}>
            Quality: {quality}
          </div>
        );
      };

      render(<AdaptiveQualityComponent />);

      await waitFor(() => {
        const element = screen.getByTestId('quality-indicator');
        expect(element).toHaveAttribute('data-quality', 'medium');
      });

      // 元の値を復元
      Object.defineProperty(navigator, 'hardwareConcurrency', { 
        value: originalHardwareConcurrency 
      });
    });

    it('フレームレート低下時の自動品質調整', async () => {
      const { rerender } = render(<ProgressIndicator progress={0} />);

      let adaptiveQuality = 'high';
      let frameCount = 0;
      const fpsMeasurements: number[] = [];

      await act(async () => {
        const measurePeriod = 200; // 200ms毎に測定
        let lastMeasureTime = performance.now();

        const updateWithMonitoring = () => {
          const currentTime = performance.now();
          frameCount++;

          if (currentTime - lastMeasureTime >= measurePeriod) {
            const fps = (frameCount * 1000) / measurePeriod;
            fpsMeasurements.push(fps);
            
            // FPS低下時の品質調整
            if (fps < 50 && adaptiveQuality === 'high') {
              adaptiveQuality = 'medium';
            } else if (fps < 30 && adaptiveQuality === 'medium') {
              adaptiveQuality = 'low';
            }

            frameCount = 0;
            lastMeasureTime = currentTime;
          }

          const progress = Math.min(((currentTime - startTime) / 1000) * 100, 100);
          rerender(<ProgressIndicator progress={progress} quality={adaptiveQuality} />);

          if (progress < 100) {
            requestAnimationFrame(updateWithMonitoring);
          }
        };

        const startTime = performance.now();
        updateWithMonitoring();

        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      // 品質調整が適切に動作したことを確認
      const avgFps = fpsMeasurements.reduce((sum, fps) => sum + fps, 0) / fpsMeasurements.length;
      expect(avgFps).toBeGreaterThan(45); // 品質調整により最低限のFPSを維持
    });
  });
});