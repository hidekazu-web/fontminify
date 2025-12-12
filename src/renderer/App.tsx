import React from 'react';
import Header from './components/Header';
import FileDropZone from './components/FileDropZone';
import FontInfoPanel from './components/FontInfoPanel';
import CharacterSetPanel from './components/CharacterSetPanel';
import ProgressPanel from './components/ProgressPanel';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorContainer from './components/ErrorContainer';
import { useFontStore } from './stores/fontStore';

function App() {
  const { selectedFiles, isProcessing, isDarkMode } = useFontStore();

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
        <Header />
        <main className="flex-1 flex min-h-0 overflow-hidden">
          {selectedFiles.length === 0 ? (
            <FileDropZone />
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* 左パネル: フォント情報 */}
              <div className="w-[280px] min-w-[250px] min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                <FontInfoPanel />
              </div>
              {/* 中央パネル: 設定オプション */}
              <div className="w-[400px] min-w-[350px] min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                <CharacterSetPanel />
              </div>
              {/* 右パネル: 進捗表示 */}
              <div className="flex-1 min-h-0 bg-gray-50 dark:bg-gray-900 overflow-auto">
                <ProgressPanel />
              </div>
            </div>
          )}
        </main>
        <ErrorContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;