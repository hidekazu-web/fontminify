import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileDropZone from '../../src/renderer/components/FileDropZone';

// Mock useFontStore
const mockAddFiles = vi.fn();
const mockSetDragOverState = vi.fn();

vi.mock('../../src/renderer/stores/fontStore', () => ({
  useFontStore: () => ({
    addFiles: mockAddFiles,
    dragOverState: false,
    setDragOverState: mockSetDragOverState,
  }),
}));

// Mock shared validation
vi.mock('../../src/shared/validation', () => ({
  validateFileList: vi.fn(() => ({
    validCount: 1,
    invalidCount: 0,
    valid: [{ file: 'test.ttf' }],
    invalid: [],
  })),
}));

// Mock electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: {
    selectFiles: vi.fn(() => Promise.resolve(['test.ttf'])),
  },
  writable: true,
});

describe('FileDropZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ドロップゾーンが正しく表示される', () => {
    render(<FileDropZone />);
    
    const dropZone = screen.getByTestId('file-drop-zone');
    expect(dropZone).toBeInTheDocument();
    
    expect(screen.getByText('フォントファイルをドロップ')).toBeInTheDocument();
    expect(screen.getByText('TTF、OTF、WOFF、WOFF2ファイルに対応')).toBeInTheDocument();
    expect(screen.getByText('ファイルを選択')).toBeInTheDocument();
  });

  it('ドラッグオーバー時にスタイルが変更される', () => {
    render(<FileDropZone />);
    
    const dropZone = screen.getByTestId('file-drop-zone');
    
    // ドラッグオーバーイベントを発火
    fireEvent.dragOver(dropZone);
    
    expect(mockSetDragOverState).toHaveBeenCalledWith(true);
  });

  it('ドラッグリーブ時にスタイルがリセットされる', () => {
    render(<FileDropZone />);
    
    const dropZone = screen.getByTestId('file-drop-zone');
    
    // ドラッグリーブイベントを発火
    fireEvent.dragLeave(dropZone);
    
    expect(mockSetDragOverState).toHaveBeenCalledWith(false);
  });

  it('ファイルドロップが正しく処理される', async () => {
    render(<FileDropZone />);
    
    const dropZone = screen.getByTestId('file-drop-zone');
    
    // テスト用ファイルオブジェクトを作成
    const file = new File(['test content'], 'test.ttf', { type: 'font/ttf' });
    
    // ドロップイベントを発火
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    await waitFor(() => {
      expect(mockSetDragOverState).toHaveBeenCalledWith(false);
    });
  });

  it('ファイル選択ボタンクリックで選択ダイアログが開く', async () => {
    render(<FileDropZone />);
    
    const selectButton = screen.getByText('ファイルを選択');
    
    fireEvent.click(selectButton);
    
    await waitFor(() => {
      expect(window.electronAPI.selectFiles).toHaveBeenCalled();
    });
  });

  it('バリデーションエラーが表示される', async () => {
    // Mock validation to return errors
    const { validateFileList } = await import('../../src/shared/validation');
    vi.mocked(validateFileList).mockReturnValue({
      validCount: 0,
      invalidCount: 1,
      valid: [],
      invalid: [{ 
        file: 'invalid.txt',
        errors: ['対応していないファイル形式です']
      }],
    });

    render(<FileDropZone />);
    
    const dropZone = screen.getByTestId('file-drop-zone');
    const file = new File(['test'], 'invalid.txt', { type: 'text/plain' });
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('ファイルの問題')).toBeInTheDocument();
      expect(screen.getByText('対応していないファイル形式です')).toBeInTheDocument();
    });
  });

  it('複数ファイルドロップが処理される', async () => {
    render(<FileDropZone />);
    
    const dropZone = screen.getByTestId('file-drop-zone');
    
    const file1 = new File(['test 1'], 'test1.ttf', { type: 'font/ttf' });
    const file2 = new File(['test 2'], 'test2.otf', { type: 'font/otf' });
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file1, file2],
      },
    });
    
    await waitFor(() => {
      expect(mockSetDragOverState).toHaveBeenCalledWith(false);
    });
  });

  it('最大ファイルサイズの表示が正しい', () => {
    render(<FileDropZone />);
    
    expect(screen.getByText('最大ファイルサイズ: 50MB')).toBeInTheDocument();
  });

  it('対応ファイル形式の表示が正しい', () => {
    render(<FileDropZone />);
    
    expect(screen.getByText('TTF、OTF、WOFF、WOFF2ファイルに対応')).toBeInTheDocument();
  });
});