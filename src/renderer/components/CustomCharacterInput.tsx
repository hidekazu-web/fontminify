import React, { useState, useEffect } from 'react';
import { useFontStore } from '../stores/fontStore';

interface CustomCharacterInputProps {
  onCharacterSetChange: (characters: string) => void;
  className?: string;
}

const CustomCharacterInput: React.FC<CustomCharacterInputProps> = ({
  onCharacterSetChange,
  className = '',
}) => {
  const [inputText, setInputText] = useState('');
  const [uniqueChars, setUniqueChars] = useState<string[]>([]);
  const [charCount, setCharCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // 入力テキストから重複を除去してユニークな文字を抽出
  useEffect(() => {
    if (inputText) {
      const chars = Array.from(inputText);
      const uniqueSet = new Set(chars);
      const uniqueArray = Array.from(uniqueSet);
      
      setUniqueChars(uniqueArray);
      setCharCount(uniqueArray.length);
      setDuplicateCount(chars.length - uniqueArray.length);
      
      // 親コンポーネントに文字セットを通知
      onCharacterSetChange(uniqueArray.join(''));
    } else {
      setUniqueChars([]);
      setCharCount(0);
      setDuplicateCount(0);
      onCharacterSetChange('');
    }
  }, [inputText, onCharacterSetChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleClearInput = () => {
    setInputText('');
  };

  const handleFileImport = async () => {
    try {
      const fileHandle = await (window as any).showOpenFilePicker({
        types: [{
          description: 'テキストファイル',
          accept: { 'text/plain': ['.txt'] }
        }],
        multiple: false
      });

      const file = await fileHandle[0].getFile();
      const text = await file.text();
      setInputText(text);
    } catch (error) {
      // ユーザーがキャンセルした場合やファイルAPIが利用できない場合
      console.log('ファイル選択がキャンセルされました');
    }
  };

  const getCharacterPreview = () => {
    if (uniqueChars.length === 0) return '';
    
    // 文字を種類別に分類
    const hiragana: string[] = [];
    const katakana: string[] = [];
    const kanji: string[] = [];
    const ascii: string[] = [];
    const symbols: string[] = [];
    const others: string[] = [];

    uniqueChars.forEach(char => {
      const code = char.charCodeAt(0);
      if (code >= 0x3040 && code <= 0x309F) {
        hiragana.push(char);
      } else if (code >= 0x30A0 && code <= 0x30FF) {
        katakana.push(char);
      } else if (code >= 0x4E00 && code <= 0x9FFF) {
        kanji.push(char);
      } else if (code >= 0x0020 && code <= 0x007E) {
        ascii.push(char);
      } else if (code >= 0x2000 && code <= 0x206F || code >= 0x3000 && code <= 0x303F) {
        symbols.push(char);
      } else {
        others.push(char);
      }
    });

    return { hiragana, katakana, kanji, ascii, symbols, others };
  };

  const preview = getCharacterPreview();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            カスタム文字セット
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFileImport}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
            >
              📁 ファイルから読み込み
            </button>
            <button
              onClick={handleClearInput}
              className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-red-600 transition-colors"
              disabled={!inputText}
            >
              🗑 クリア
            </button>
          </div>
        </div>
        
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder="含めたい文字を直接入力してください。テキストファイルからのインポートも可能です。"
          className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          style={{ fontFamily: 'monospace' }}
        />
      </div>

      {/* 統計情報 */}
      {charCount > 0 && (
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <div className="space-x-4">
              <span className="text-gray-600">
                ユニーク文字数: <span className="font-semibold text-primary-600">{charCount}</span>
              </span>
              {duplicateCount > 0 && (
                <span className="text-gray-500">
                  重複除去: {duplicateCount}文字
                </span>
              )}
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs px-2 py-1 bg-primary-100 hover:bg-primary-200 rounded text-primary-700 transition-colors"
            >
              {showPreview ? '▲ 非表示' : '▼ プレビュー'}
            </button>
          </div>
        </div>
      )}

      {/* 文字種別プレビュー */}
      {showPreview && charCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-800 mb-3">文字種別プレビュー</h4>
          
          {preview.hiragana.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">
                ひらがな ({preview.hiragana.length}文字)
              </div>
              <div className="text-sm bg-blue-50 p-2 rounded text-blue-800 break-all">
                {preview.hiragana.join('')}
              </div>
            </div>
          )}
          
          {preview.katakana.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">
                カタカナ ({preview.katakana.length}文字)
              </div>
              <div className="text-sm bg-green-50 p-2 rounded text-green-800 break-all">
                {preview.katakana.join('')}
              </div>
            </div>
          )}
          
          {preview.kanji.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">
                漢字 ({preview.kanji.length}文字)
              </div>
              <div className="text-sm bg-red-50 p-2 rounded text-red-800 break-all">
                {preview.kanji.slice(0, 50).join('')}
                {preview.kanji.length > 50 && '...'}
              </div>
            </div>
          )}
          
          {preview.ascii.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">
                ASCII ({preview.ascii.length}文字)
              </div>
              <div className="text-sm bg-yellow-50 p-2 rounded text-yellow-800 break-all font-mono">
                {preview.ascii.join('')}
              </div>
            </div>
          )}
          
          {preview.symbols.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">
                記号 ({preview.symbols.length}文字)
              </div>
              <div className="text-sm bg-purple-50 p-2 rounded text-purple-800 break-all">
                {preview.symbols.join('')}
              </div>
            </div>
          )}
          
          {preview.others.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">
                その他 ({preview.others.length}文字)
              </div>
              <div className="text-sm bg-gray-50 p-2 rounded text-gray-800 break-all">
                {preview.others.join('')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 警告メッセージ */}
      {charCount > 5000 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                文字数が多すぎます
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {charCount}文字が選択されています。大量の文字はサブセット化の効果を低下させる可能性があります。
                  必要最小限の文字セットを使用することをお勧めします。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomCharacterInput;