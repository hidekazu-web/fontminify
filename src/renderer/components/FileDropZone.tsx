import React, { useState } from 'react';
import { useFontStore } from '../stores/fontStore';
import { validateFileList } from '../../shared/validation';

const FileDropZone: React.FC = () => {
  const [localDragOver, setLocalDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { addFiles, isDragOver, setDragOverState } = useFontStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setLocalDragOver(true);
    setDragOverState(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setLocalDragOver(false);
    setDragOverState(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setLocalDragOver(false);
    setDragOverState(false);
    setValidationErrors([]);

    const files = Array.from(e.dataTransfer.files);
    
    // ファイルバリデーション
    const validation = validateFileList(files);
    
    // Electron APIでファイルパスを取得
    const getFilePath = (file: File): string => {
      if (window.electronAPI?.getPathForFile) {
        return window.electronAPI.getPathForFile(file);
      }
      return file.name;
    };

    if (validation.invalidCount > 0) {
      const errors = validation.invalid.flatMap(result => result.errors);
      setValidationErrors(errors);

      // 部分的に有効なファイルがある場合は追加
      if (validation.validCount > 0) {
        const validFilePaths = validation.valid.map(result =>
          getFilePath(result.file as File)
        );
        addFiles(validFilePaths);
      }
    } else if (validation.validCount > 0) {
      const filePaths = validation.valid.map(result =>
        getFilePath(result.file as File)
      );
      addFiles(filePaths);
    }
  };

  const handleFileSelect = async () => {
    try {
      setValidationErrors([]);
      
      // ElectronAPIが利用可能な場合
      if (window.electronAPI && window.electronAPI.selectFiles) {
        const filePaths = await window.electronAPI.selectFiles();
        if (filePaths && filePaths.length > 0) {
          // ファイルパスバリデーション
          const validation = validateFileList(filePaths);
          
          if (validation.invalidCount > 0) {
            const errors = validation.invalid.flatMap(result => result.errors);
            setValidationErrors(errors);
          }
          
          if (validation.validCount > 0) {
            addFiles(validation.valid.map(result => result.file as string));
          }
        }
      } else {
        // Web版：HTMLの input を使用
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.ttf,.otf,.woff,.woff2';
        
        input.onchange = (e) => {
          const files = Array.from((e.target as HTMLInputElement).files || []);
          if (files.length > 0) {
            // ファイルバリデーション
            const validation = validateFileList(files);
            
            if (validation.invalidCount > 0) {
              const errors = validation.invalid.flatMap(result => result.errors);
              setValidationErrors(errors);
            }
            
            if (validation.validCount > 0) {
              const filePaths = validation.valid.map(result => 
                (result.file as File).name
              );
              addFiles(filePaths);
            }
          }
        };
        
        input.click();
      }
    } catch (error) {
      setValidationErrors(['ファイル選択中にエラーが発生しました']);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-900">
      <div 
        data-testid="file-drop-zone"
        className={`w-full max-w-lg h-72 border-3 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 bg-white dark:bg-gray-800 ${
          localDragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <div className="text-center text-gray-600 dark:text-gray-300">
          <div className="mb-4 text-gray-400 dark:text-gray-500">
            <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">フォントファイルをドロップ</h3>
          <p className="mb-5 text-gray-600 dark:text-gray-400">TTF、OTF、WOFF、WOFF2ファイルに対応</p>
          <p className="mb-5 text-xs text-gray-500 dark:text-gray-500">最大ファイルサイズ: 50MB</p>
          <button className="bg-primary-500 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-primary-600 transition-colors">
            ファイルを選択
          </button>
        </div>
      </div>
      
      {validationErrors.length > 0 && (
        <div className="w-full max-w-lg mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">ファイルの問題</h4>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;