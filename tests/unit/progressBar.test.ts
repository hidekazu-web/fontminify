import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProgressBar from '../../src/renderer/components/ProgressBar';
import { ProgressState } from '../../src/shared/types';

describe('プログレス表示テスト（進捗率の精度）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的なプログレス表示', () => {
    it('0%の進捗が正しく表示される', () => {
      const progress: ProgressState = {
        phase: 'idle',
        progress: 0,
        message: '待機中'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      
      // 視覚的な幅が0%であることを確認
      const progressFill = progressBar.querySelector('[data-testid="progress-fill"]');
      expect(progressFill).toHaveStyle('width: 0%');
    });

    it('50%の進捗が正しく表示される', () => {
      const progress: ProgressState = {
        phase: 'subsetting',
        progress: 50,
        message: 'サブセット化中'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      
      const progressFill = progressBar.querySelector('[data-testid="progress-fill"]');
      expect(progressFill).toHaveStyle('width: 50%');
      
      // パーセンテージテキストの確認
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('100%の進捗が正しく表示される', () => {
      const progress: ProgressState = {
        phase: 'complete',
        progress: 100,
        message: '完了'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      
      const progressFill = progressBar.querySelector('[data-testid="progress-fill"]');
      expect(progressFill).toHaveStyle('width: 100%');
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('小数点を含む進捗率', () => {
    it('小数点付きの進捗が正しく表示される', () => {
      const progress: ProgressState = {
        phase: 'analyzing',
        progress: 33.33,
        message: 'フォント解析中'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '33.33');
      
      const progressFill = progressBar.querySelector('[data-testid="progress-fill"]');
      expect(progressFill).toHaveStyle('width: 33.33%');
      
      // 小数点は1桁まで表示
      expect(screen.getByText('33.3%')).toBeInTheDocument();
    });

    it('高精度な進捗率が適切に丸められる', () => {
      const progress: ProgressState = {
        phase: 'compressing',
        progress: 66.66666666666667,
        message: 'WOFF2圧縮中'
      };

      render(<ProgressBar progress={progress} />);

      // 小数点1桁に丸められる
      expect(screen.getByText('66.7%')).toBeInTheDocument();
    });
  });

  describe('フェーズ別の表示', () => {
    const phases: Array<{ phase: ProgressState['phase']; expectedLabel: string; expectedColor: string }> = [
      { phase: 'idle', expectedLabel: '待機中', expectedColor: 'bg-gray-200' },
      { phase: 'analyzing', expectedLabel: 'フォント解析中', expectedColor: 'bg-blue-500' },
      { phase: 'subsetting', expectedLabel: 'サブセット化中', expectedColor: 'bg-yellow-500' },
      { phase: 'optimizing', expectedLabel: '最適化中', expectedColor: 'bg-orange-500' },
      { phase: 'compressing', expectedLabel: 'WOFF2圧縮中', expectedColor: 'bg-purple-500' },
      { phase: 'complete', expectedLabel: '完了', expectedColor: 'bg-green-500' }
    ];

    phases.forEach(({ phase, expectedLabel, expectedColor }) => {
      it(`${phase}フェーズが正しく表示される`, () => {
        const progress: ProgressState = {
          phase,
          progress: 50,
          message: expectedLabel
        };

        render(<ProgressBar progress={progress} />);

        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        
        const progressFill = screen.getByTestId('progress-fill');
        expect(progressFill).toHaveClass(expectedColor);
      });
    });
  });

  describe('エラー状態の表示', () => {
    it('エラー状態が正しく表示される', () => {
      const progress: ProgressState = {
        phase: 'idle',
        progress: 0,
        message: 'エラーが発生しました',
        error: {
          type: 'SUBSET_FAILED',
          message: 'サブセット化に失敗しました',
          recoverable: true
        }
      };

      render(<ProgressBar progress={progress} />);

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      
      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveClass('bg-red-500');
    });

    it('リカバリー可能なエラーの場合の表示', () => {
      const progress: ProgressState = {
        phase: 'idle',
        progress: 0,
        message: 'エラー',
        error: {
          type: 'FILE_NOT_FOUND',
          message: 'ファイルが見つかりません',
          recoverable: true
        }
      };

      render(<ProgressBar progress={progress} />);

      // リカバリー可能エラーの場合は再試行ボタンが表示される
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });
  });

  describe('キャンセル機能', () => {
    it('キャンセルボタンが表示される', () => {
      const mockOnCancel = vi.fn();
      const progress: ProgressState = {
        phase: 'subsetting',
        progress: 30,
        message: 'サブセット化中'
      };

      render(<ProgressBar progress={progress} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText('キャンセル');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeEnabled();
    });

    it('キャンセルボタンをクリックするとコールバックが呼ばれる', () => {
      const mockOnCancel = vi.fn();
      const progress: ProgressState = {
        phase: 'compressing',
        progress: 75,
        message: 'WOFF2圧縮中'
      };

      render(<ProgressBar progress={progress} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('完了状態ではキャンセルボタンが表示されない', () => {
      const mockOnCancel = vi.fn();
      const progress: ProgressState = {
        phase: 'complete',
        progress: 100,
        message: '完了'
      };

      render(<ProgressBar progress={progress} onCancel={mockOnCancel} />);

      expect(screen.queryByText('キャンセル')).not.toBeInTheDocument();
    });

    it('エラー状態ではキャンセルボタンが表示されない', () => {
      const mockOnCancel = vi.fn();
      const progress: ProgressState = {
        phase: 'idle',
        progress: 0,
        message: 'エラー',
        error: {
          type: 'UNKNOWN_ERROR',
          message: 'エラーが発生しました',
          recoverable: false
        }
      };

      render(<ProgressBar progress={progress} onCancel={mockOnCancel} />);

      expect(screen.queryByText('キャンセル')).not.toBeInTheDocument();
    });
  });

  describe('アニメーション効果', () => {
    it('進捗バーがスムーズにアニメーションする', async () => {
      const { rerender } = render(<ProgressBar progress={{ phase: 'analyzing', progress: 0, message: '開始' }} />);

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 0%');

      // 進捗を50%に更新
      rerender(<ProgressBar progress={{ phase: 'subsetting', progress: 50, message: '進行中' }} />);

      // CSS transitionが適用されていることを確認
      expect(progressFill).toHaveClass('transition-all');
      expect(progressFill).toHaveClass('duration-300');
      expect(progressFill).toHaveStyle('width: 50%');
    });

    it('フェーズ変更時に色がアニメーションする', async () => {
      const { rerender } = render(<ProgressBar progress={{ phase: 'analyzing', progress: 25, message: '解析中' }} />);

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveClass('bg-blue-500');

      // フェーズを変更
      rerender(<ProgressBar progress={{ phase: 'subsetting', progress: 50, message: 'サブセット化中' }} />);

      expect(progressFill).toHaveClass('bg-yellow-500');
    });
  });

  describe('アクセシビリティ', () => {
    it('プログレスバーに適切なARIA属性が設定される', () => {
      const progress: ProgressState = {
        phase: 'optimizing',
        progress: 80,
        message: '最適化中'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '80');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', '最適化中 - 80%完了');
    });

    it('スクリーンリーダー用のテキストが適切に設定される', () => {
      const progress: ProgressState = {
        phase: 'compressing',
        progress: 65.5,
        message: 'WOFF2圧縮中'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'WOFF2圧縮中 - 65.5%完了');
    });

    it('キャンセルボタンにフォーカスできる', () => {
      const mockOnCancel = vi.fn();
      const progress: ProgressState = {
        phase: 'analyzing',
        progress: 20,
        message: 'フォント解析中'
      };

      render(<ProgressBar progress={progress} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText('キャンセル');
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();
      
      // Enterキーでも実行できる
      fireEvent.keyDown(cancelButton, { key: 'Enter' });
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('エッジケース', () => {
    it('負の進捗率が0にクランプされる', () => {
      const progress: ProgressState = {
        phase: 'analyzing',
        progress: -10,
        message: 'テスト'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      
      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 0%');
    });

    it('100%を超える進捗率が100にクランプされる', () => {
      const progress: ProgressState = {
        phase: 'complete',
        progress: 120,
        message: '完了'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      
      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 100%');
    });

    it('NaN進捗率が0として扱われる', () => {
      const progress: ProgressState = {
        phase: 'analyzing',
        progress: NaN,
        message: 'テスト'
      };

      render(<ProgressBar progress={progress} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('非常に長いメッセージが適切に表示される', () => {
      const longMessage = 'これは非常に長いメッセージです。' + 'あ'.repeat(100);
      const progress: ProgressState = {
        phase: 'subsetting',
        progress: 50,
        message: longMessage
      };

      render(<ProgressBar progress={progress} />);

      // メッセージが表示されることを確認（省略される可能性もある）
      expect(screen.getByText(longMessage, { exact: false })).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    it('小さな画面でも適切に表示される', () => {
      // 小さなコンテナをシミュレート
      const progress: ProgressState = {
        phase: 'analyzing',
        progress: 40,
        message: 'フォント解析中'
      };

      render(
        <div style={{ width: '200px' }}>
          <ProgressBar progress={progress} />
        </div>
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      
      // パーセンテージが表示されることを確認
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });

  describe('パフォーマンステスト', () => {
    it('頻繁な更新でもパフォーマンスが保たれる', async () => {
      const startTime = Date.now();
      const { rerender } = render(<ProgressBar progress={{ phase: 'analyzing', progress: 0, message: '開始' }} />);

      // 100回の更新をシミュレート
      for (let i = 1; i <= 100; i++) {
        rerender(<ProgressBar progress={{ phase: 'subsetting', progress: i, message: `進行中 ${i}%` }} />);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 100回の更新が1秒以内に完了することを確認
      expect(duration).toBeLessThan(1000);
    });

    it('大量のメッセージ更新が効率的に処理される', () => {
      const progress: ProgressState = {
        phase: 'compressing',
        progress: 50,
        message: 'テストメッセージ'
      };

      const startTime = Date.now();
      const { rerender } = render(<ProgressBar progress={progress} />);

      // 1000回のメッセージ更新
      for (let i = 0; i < 1000; i++) {
        rerender(<ProgressBar progress={{ ...progress, message: `メッセージ ${i}` }} />);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
    });
  });
});