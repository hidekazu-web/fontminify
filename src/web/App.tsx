import React from 'react'
import { FileDropZone } from './components/FileDropZone'
import { ErrorContainer } from './components/ErrorToast'
import { useFontStore } from './stores/fontStore'
import { CHARACTER_PRESETS } from '../shared/presets'
import { OutputFormat } from '../shared/types'

export function App() {
  const {
    files,
    isProcessing,
    progressState,
    selectedPreset,
    customCharacters,
    outputFormat,
    setSelectedPreset,
    setCustomCharacters,
    setOutputFormat,
    processFont,
    errors,
    removeError,
    getTotalCharacterCount
  } = useFontStore()

  const hasFiles = files.size > 0
  const firstEntry = hasFiles ? Array.from(files.values())[0] : null
  const isReady = firstEntry?.status === 'ready'

  const handleProcess = async () => {
    if (firstEntry) {
      await processFont(firstEntry.id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* エラートースト */}
      <ErrorContainer errors={errors} onDismiss={removeError} />

      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">FontMinify</h1>
          <p className="text-sm opacity-90">日本語フォント最適化ツール - Web版</p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto py-8 px-4 w-full">
        {/* ファイルドロップゾーン */}
        <FileDropZone />

        {/* フォント情報 */}
        {firstEntry?.analysis && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">フォント情報</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">フォント名</dt>
                <dd className="font-medium text-gray-900">{firstEntry.analysis.fontFamily}</dd>
              </div>
              <div>
                <dt className="text-gray-500">スタイル</dt>
                <dd className="font-medium text-gray-900">{firstEntry.analysis.fontSubfamily}</dd>
              </div>
              <div>
                <dt className="text-gray-500">グリフ数</dt>
                <dd className="font-medium text-gray-900">{firstEntry.analysis.glyphCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ファイルサイズ</dt>
                <dd className="font-medium text-gray-900">
                  {(firstEntry.analysis.fileSize / 1024 / 1024).toFixed(2)} MB
                </dd>
              </div>
              {firstEntry.analysis.isVariableFont && (
                <div className="col-span-2">
                  <dt className="text-gray-500">バリアブルフォント</dt>
                  <dd className="font-medium text-green-600">対応</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* 文字セット選択 */}
        {isReady && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">文字セット選択</h2>

            <div className="space-y-3">
              {CHARACTER_PRESETS.map((preset) => (
                <label
                  key={preset.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPreset === preset.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value={preset.id}
                    checked={selectedPreset === preset.id}
                    onChange={() => setSelectedPreset(preset.id)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{preset.name}</div>
                    <div className="text-sm text-gray-500">{preset.description}</div>
                  </div>
                  <div className="text-sm text-gray-400">
                    約{preset.characterCount.toLocaleString()}文字
                  </div>
                </label>
              ))}

              {/* カスタム入力 */}
              <label
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPreset === 'custom'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="preset"
                  value="custom"
                  checked={selectedPreset === 'custom'}
                  onChange={() => setSelectedPreset('custom')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">カスタム</div>
                  <div className="text-sm text-gray-500 mb-2">使用する文字を直接入力</div>
                  {selectedPreset === 'custom' && (
                    <textarea
                      value={customCharacters}
                      onChange={(e) => setCustomCharacters(e.target.value)}
                      placeholder="ここに使用する文字を入力..."
                      className="w-full h-24 p-2 border border-gray-300 rounded text-sm resize-none focus:ring-blue-500 focus:border-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </label>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              選択中の文字数: <span className="font-medium">{getTotalCharacterCount().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* 出力設定 */}
        {isReady && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">出力設定</h2>

            <div className="grid grid-cols-4 gap-2">
              {(['woff2', 'woff', 'ttf', 'otf'] as OutputFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setOutputFormat(format)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    outputFormat === format
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium uppercase">{format}</div>
                  <div className="text-xs text-gray-500">
                    {format === 'woff2' && '推奨'}
                    {format === 'woff' && '高圧縮'}
                    {format === 'ttf' && '標準'}
                    {format === 'otf' && 'OpenType'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 処理ボタン */}
        {isReady && !isProcessing && (
          <div className="mt-6">
            <button
              onClick={handleProcess}
              disabled={!selectedPreset && !customCharacters}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-4 px-6 rounded-lg transition-colors disabled:cursor-not-allowed text-lg"
            >
              サブセット化してダウンロード
            </button>
          </div>
        )}

        {/* 処理中表示 */}
        {isProcessing && progressState && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">処理中...</h2>

            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-600">{progressState.message}</span>
              <span className="font-medium text-gray-900">{progressState.progress}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressState.progress}%` }}
              />
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>FontMinify Web版 - 全ての処理はブラウザ内で完結します</p>
        <p className="mt-1">フォントファイルはサーバーに送信されません</p>
      </footer>
    </div>
  )
}
