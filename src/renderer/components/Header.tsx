import React from 'react';
import { useFontStore } from '../stores/fontStore';

const Header: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useFontStore();

  return (
    <header className="bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-gray-800 dark:to-gray-900 text-white px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <div className="app-title">
          <h1 className="text-2xl font-semibold mb-1">FontMinify</h1>
          <span className="text-sm opacity-80">日本語フォント最適化ツール</span>
        </div>
        <div className="header-actions flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {isDarkMode ? (
              // Sun icon for light mode
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              // Moon icon for dark mode
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;