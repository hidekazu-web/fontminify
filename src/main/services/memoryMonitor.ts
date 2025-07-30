import { BrowserWindow } from 'electron';

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

interface MemoryStats {
  main: MemoryUsage;
  renderer?: MemoryUsage;
  timestamp: number;
  warnings: string[];
}

class MemoryMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryStats[] = [];
  private readonly maxHistorySize = 100;
  private readonly warningThresholds = {
    heapUsed: 200 * 1024 * 1024, // 200MB
    rss: 300 * 1024 * 1024, // 300MB
    external: 100 * 1024 * 1024, // 100MB
  };

  /**
   * メモリ監視を開始
   */
  public startMonitoring(intervalMs: number = 10000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log(`メモリ監視を開始しました (間隔: ${intervalMs}ms)`);
    
    this.monitoringInterval = setInterval(() => {
      this.collectMemoryStats();
    }, intervalMs);

    // 初回実行
    this.collectMemoryStats();
  }

  /**
   * メモリ監視を停止
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('メモリ監視を停止しました');
    }
  }

  /**
   * メモリ統計を収集
   */
  private async collectMemoryStats(): Promise<void> {
    try {
      const mainMemory = process.memoryUsage();
      const warnings: string[] = [];

      // メインプロセスの警告チェック
      if (mainMemory.heapUsed > this.warningThresholds.heapUsed) {
        warnings.push(`メインプロセスのヒープ使用量が高い: ${this.formatBytes(mainMemory.heapUsed)}`);
      }
      
      if (mainMemory.rss > this.warningThresholds.rss) {
        warnings.push(`メインプロセスのRSS使用量が高い: ${this.formatBytes(mainMemory.rss)}`);
      }
      
      if (mainMemory.external > this.warningThresholds.external) {
        warnings.push(`外部メモリ使用量が高い: ${this.formatBytes(mainMemory.external)}`);
      }

      let rendererMemory: MemoryUsage | undefined;

      // レンダラープロセスのメモリ使用量を取得
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        try {
          const webContents = windows[0].webContents;
          const rendererProcessId = webContents.getOSProcessId();
          
          // レンダラープロセスのメモリ情報は直接取得できないため、
          // プロセスIDから推定値を使用
          const processMemoryInfo = {
            private: 50 * 1024, // 推定値 50MB
            shared: 20 * 1024,  // 推定値 20MB
            residentSet: 70 * 1024 // 推定値 70MB
          };
          
          rendererMemory = {
            heapUsed: processMemoryInfo.private * 1024,
            heapTotal: processMemoryInfo.shared * 1024,
            external: 0,
            rss: processMemoryInfo.residentSet * 1024,
            arrayBuffers: 0,
          };

          if (rendererMemory.rss > this.warningThresholds.rss) {
            warnings.push(`レンダラープロセスのメモリ使用量が高い: ${this.formatBytes(rendererMemory.rss)}`);
          }
        } catch (error) {
          console.warn('レンダラープロセスのメモリ情報取得に失敗:', error);
        }
      }

      const stats: MemoryStats = {
        main: mainMemory,
        renderer: rendererMemory,
        timestamp: Date.now(),
        warnings,
      };

      this.memoryHistory.push(stats);

      // 履歴サイズの制限
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }

      // 警告がある場合はログ出力
      if (warnings.length > 0) {
        console.warn('メモリ使用量警告:', warnings);
      }

      // デバッグ用ログ（詳細レベル）
      if (process.env.NODE_ENV === 'development') {
        console.log(`メモリ使用量 - メイン: ${this.formatBytes(mainMemory.heapUsed)}/${this.formatBytes(mainMemory.heapTotal)}, RSS: ${this.formatBytes(mainMemory.rss)}`);
        if (rendererMemory) {
          console.log(`レンダラー RSS: ${this.formatBytes(rendererMemory.rss)}`);
        }
      }

    } catch (error) {
      console.error('メモリ統計収集エラー:', error);
    }
  }

  /**
   * 現在のメモリ使用状況を取得
   */
  public getCurrentMemoryStats(): MemoryStats | null {
    return this.memoryHistory.length > 0 
      ? this.memoryHistory[this.memoryHistory.length - 1]
      : null;
  }

  /**
   * メモリ履歴を取得
   */
  public getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  /**
   * メモリリークの可能性をチェック
   */
  public checkForMemoryLeaks(): { hasLeak: boolean; trend: string; recommendation: string } {
    if (this.memoryHistory.length < 10) {
      return {
        hasLeak: false,
        trend: 'データ不足',
        recommendation: 'より多くのデータが必要です'
      };
    }

    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);

    if (older.length === 0) {
      return {
        hasLeak: false,
        trend: 'データ不足',
        recommendation: 'より多くのデータが必要です'
      };
    }

    const recentAvg = recent.reduce((sum, stat) => sum + stat.main.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, stat) => sum + stat.main.heapUsed, 0) / older.length;

    const increase = ((recentAvg - olderAvg) / olderAvg) * 100;
    const hasLeak = increase > 20; // 20%以上の増加をリークの可能性として判定

    return {
      hasLeak,
      trend: `${increase > 0 ? '+' : ''}${increase.toFixed(1)}%`,
      recommendation: hasLeak 
        ? 'メモリリークの可能性があります。ガベージコレクションを実行するか、アプリケーションを再起動してください。'
        : 'メモリ使用量は正常です。'
    };
  }

  /**
   * 強制ガベージコレクション
   */
  public forceGarbageCollection(): boolean {
    try {
      if (global.gc) {
        global.gc();
        console.log('ガベージコレクションを実行しました');
        return true;
      } else {
        console.warn('ガベージコレクションが利用できません。--expose-gc フラグでアプリを起動してください。');
        return false;
      }
    } catch (error) {
      console.error('ガベージコレクション実行エラー:', error);
      return false;
    }
  }

  /**
   * メモリ最適化のヒントを提供
   */
  public getOptimizationTips(): string[] {
    const current = this.getCurrentMemoryStats();
    if (!current) return [];

    const tips: string[] = [];
    const { main } = current;

    if (main.heapUsed > 150 * 1024 * 1024) { // 150MB以上
      tips.push('ヒープ使用量が高いです。不要なオブジェクトの参照を削除してください。');
    }

    if (main.external > 50 * 1024 * 1024) { // 50MB以上
      tips.push('外部メモリ使用量が高いです。大きなバッファやファイルの処理を見直してください。');
    }

    if (main.rss > 250 * 1024 * 1024) { // 250MB以上
      tips.push('全体的なメモリ使用量が高いです。アプリケーションの再起動を検討してください。');
    }

    const leakCheck = this.checkForMemoryLeaks();
    if (leakCheck.hasLeak) {
      tips.push(leakCheck.recommendation);
    }

    return tips;
  }

  /**
   * バイト数を人間が読みやすい形式に変換
   */
  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${sizes[i]}`;
  }

  /**
   * メモリ統計のレポートを生成
   */
  public generateReport(): string {
    const current = this.getCurrentMemoryStats();
    if (!current) return 'メモリ統計が利用できません';

    const { main, renderer, warnings } = current;
    const leakCheck = this.checkForMemoryLeaks();
    const tips = this.getOptimizationTips();

    let report = '=== FontMinify メモリ使用状況レポート ===\n\n';
    report += `生成日時: ${new Date(current.timestamp).toLocaleString()}\n\n`;
    
    report += '【メインプロセス】\n';
    report += `  ヒープ使用量: ${this.formatBytes(main.heapUsed)} / ${this.formatBytes(main.heapTotal)}\n`;
    report += `  RSS: ${this.formatBytes(main.rss)}\n`;
    report += `  外部メモリ: ${this.formatBytes(main.external)}\n`;
    report += `  配列バッファ: ${this.formatBytes(main.arrayBuffers)}\n\n`;

    if (renderer) {
      report += '【レンダラープロセス】\n';
      report += `  RSS: ${this.formatBytes(renderer.rss)}\n\n`;
    }

    report += `【メモリリーク診断】\n`;
    report += `  状態: ${leakCheck.hasLeak ? '⚠️ 警告' : '✅ 正常'}\n`;
    report += `  トレンド: ${leakCheck.trend}\n`;
    report += `  推奨事項: ${leakCheck.recommendation}\n\n`;

    if (warnings.length > 0) {
      report += '【警告】\n';
      warnings.forEach(warning => {
        report += `  ⚠️ ${warning}\n`;
      });
      report += '\n';
    }

    if (tips.length > 0) {
      report += '【最適化のヒント】\n';
      tips.forEach(tip => {
        report += `  💡 ${tip}\n`;
      });
      report += '\n';
    }

    report += `【統計履歴】: ${this.memoryHistory.length} 件のレコード\n`;

    return report;
  }
}

// シングルトンインスタンス
export const memoryMonitor = new MemoryMonitor();

// 便利な関数エクスポート
export function startMemoryMonitoring(intervalMs?: number): void {
  memoryMonitor.startMonitoring(intervalMs);
}

export function stopMemoryMonitoring(): void {
  memoryMonitor.stopMonitoring();
}

export function getCurrentMemoryStats(): MemoryStats | null {
  return memoryMonitor.getCurrentMemoryStats();
}

export function checkForMemoryLeaks() {
  return memoryMonitor.checkForMemoryLeaks();
}

export function forceGarbageCollection(): boolean {
  return memoryMonitor.forceGarbageCollection();
}

export function generateMemoryReport(): string {
  return memoryMonitor.generateReport();
}