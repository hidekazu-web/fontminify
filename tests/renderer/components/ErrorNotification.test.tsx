import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorNotification from '@renderer/components/ErrorNotification';
import { ErrorType } from '@shared/errors';
import type { AppError } from '@shared/errors';

// モックタイマー
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ErrorNotification', () => {
  const mockError: AppError = {
    type: ErrorType.FILE_NOT_FOUND,
    message: 'ファイルが見つかりません',
    recoverable: true,
    timestamp: Date.now(),
    filePath: '/path/to/font.ttf'
  };

  const defaultProps = {
    error: mockError,
    onDismiss: vi.fn(),
  };

  it('should render error message', () => {
    render(<ErrorNotification {...defaultProps} />);
    
    expect(screen.getByText('ファイルが見つかりません')).toBeInTheDocument();
  });

  it('should show file path when provided', () => {
    render(<ErrorNotification {...defaultProps} />);
    
    expect(screen.getByText('/path/to/font.ttf')).toBeInTheDocument();
  });

  it('should call onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorNotification {...defaultProps} onDismiss={onDismiss} />);
    
    const closeButton = screen.getByRole('button', { name: /閉じる|close/i });
    fireEvent.click(closeButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show retry button for recoverable errors', () => {
    const onRetry = vi.fn();
    render(
      <ErrorNotification 
        {...defaultProps} 
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /再試行|retry/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button for non-recoverable errors', () => {
    const nonRecoverableError: AppError = {
      ...mockError,
      type: ErrorType.CORRUPT_FONT,
      recoverable: false
    };
    
    render(
      <ErrorNotification 
        {...defaultProps} 
        error={nonRecoverableError}
        onRetry={vi.fn()}
      />
    );
    
    const retryButton = screen.queryByRole('button', { name: /再試行|retry/i });
    expect(retryButton).not.toBeInTheDocument();
  });

  it('should auto-hide after specified duration', async () => {
    const onDismiss = vi.fn();
    render(
      <ErrorNotification 
        {...defaultProps} 
        onDismiss={onDismiss}
        autoHide={true}
        duration={3000}
      />
    );
    
    // 3秒経過をシミュレート
    vi.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('should not auto-hide when autoHide is false', async () => {
    const onDismiss = vi.fn();
    render(
      <ErrorNotification 
        {...defaultProps} 
        onDismiss={onDismiss}
        autoHide={false}
        duration={3000}
      />
    );
    
    vi.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(onDismiss).not.toHaveBeenCalled();
    }, { timeout: 100 });
  });

  it('should apply correct styling based on error severity', () => {
    const { rerender } = render(<ErrorNotification {...defaultProps} />);
    
    // Error severity (default)
    let container = screen.getByRole('alert').parentElement;
    expect(container).toHaveClass('border-red-200');
    
    // Warning severity
    const warningError: AppError = {
      ...mockError,
      type: ErrorType.COMPRESSION_FAILED
    };
    
    rerender(<ErrorNotification {...defaultProps} error={warningError} />);
    container = screen.getByRole('alert').parentElement;
    expect(container).toHaveClass('border-yellow-200');
  });

  it('should show expandable details when provided', () => {
    const errorWithDetails: AppError = {
      ...mockError,
      suggestion: 'ファイルパスを確認してください'
    };
    
    render(<ErrorNotification {...defaultProps} error={errorWithDetails} />);
    
    const detailsButton = screen.getByRole('button', { name: /詳細|details/i });
    expect(detailsButton).toBeInTheDocument();
    
    fireEvent.click(detailsButton);
    expect(screen.getByText('ファイルパスを確認してください')).toBeInTheDocument();
  });

  it('should format timestamp correctly', () => {
    const timestamp = new Date('2023-12-01T10:30:00').getTime();
    const errorWithTimestamp: AppError = {
      ...mockError,
      timestamp
    };
    
    render(<ErrorNotification {...defaultProps} error={errorWithTimestamp} />);
    
    // タイムスタンプの表示確認（形式は実装に依存）
    expect(screen.getByText(/10:30|2023/)).toBeInTheDocument();
  });

  it('should handle mouse hover events', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorNotification 
        {...defaultProps} 
        onDismiss={onDismiss}
        autoHide={true}
        duration={3000}
      />
    );
    
    const notification = screen.getByRole('alert');
    
    // ホバー開始でタイマー停止
    fireEvent.mouseEnter(notification);
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
    
    // ホバー終了でタイマー再開
    fireEvent.mouseLeave(notification);
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should be accessible', () => {
    render(<ErrorNotification {...defaultProps} />);
    
    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    expect(notification).toHaveAttribute('aria-live', 'polite');
  });
});