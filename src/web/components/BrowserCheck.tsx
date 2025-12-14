import React, { useEffect, useState } from 'react'

interface BrowserSupport {
  webAssembly: boolean
  fileAPI: boolean
  webWorker: boolean
  overall: boolean
}

function checkBrowserSupport(): BrowserSupport {
  const webAssembly = typeof WebAssembly !== 'undefined' &&
    typeof WebAssembly.instantiate === 'function'

  const fileAPI = typeof File !== 'undefined' &&
    typeof FileReader !== 'undefined' &&
    typeof Blob !== 'undefined'

  const webWorker = typeof Worker !== 'undefined'

  return {
    webAssembly,
    fileAPI,
    webWorker,
    overall: webAssembly && fileAPI && webWorker
  }
}

export function BrowserCheck({ children }: { children: React.ReactNode }) {
  const [support, setSupport] = useState<BrowserSupport | null>(null)

  useEffect(() => {
    setSupport(checkBrowserSupport())
  }, [])

  // 初期ロード中
  if (support === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // ブラウザ非対応
  if (!support.overall) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ブラウザが対応していません
          </h1>

          <p className="text-gray-600 mb-6">
            FontMinifyを使用するには、以下の機能に対応したブラウザが必要です。
          </p>

          <div className="space-y-3 text-left mb-6">
            <div className={`flex items-center gap-2 p-3 rounded-lg ${support.webAssembly ? 'bg-green-50' : 'bg-red-50'}`}>
              {support.webAssembly ? (
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              <span className={support.webAssembly ? 'text-green-700' : 'text-red-700'}>
                WebAssembly
              </span>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-lg ${support.webWorker ? 'bg-green-50' : 'bg-red-50'}`}>
              {support.webWorker ? (
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              <span className={support.webWorker ? 'text-green-700' : 'text-red-700'}>
                Web Workers
              </span>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-lg ${support.fileAPI ? 'bg-green-50' : 'bg-red-50'}`}>
              {support.fileAPI ? (
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              <span className={support.fileAPI ? 'text-green-700' : 'text-red-700'}>
                File API
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p className="mb-2">推奨ブラウザ:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Chrome 89以降</li>
              <li>Firefox 78以降</li>
              <li>Safari 15以降</li>
              <li>Edge 89以降</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // ブラウザ対応OK
  return <>{children}</>
}
