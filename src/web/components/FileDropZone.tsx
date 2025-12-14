import React, { useState } from 'react'
import { useFontStore } from '../stores/fontStore'
import { validateFontFile } from '../services/fileHandler'

export function FileDropZone() {
  const [localDragOver, setLocalDragOver] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const { addFiles, files, isProcessing, processFont, setDragOverState } = useFontStore()

  const hasFiles = files.size > 0
  const firstEntry = hasFiles ? Array.from(files.values())[0] : null
  const isReady = firstEntry?.status === 'ready'

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setLocalDragOver(true)
    setDragOverState(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setLocalDragOver(false)
    setDragOverState(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setLocalDragOver(false)
    setDragOverState(false)
    setValidationErrors([])

    const droppedFiles = Array.from(e.dataTransfer.files)
    const errors: string[] = []
    const validFiles: File[] = []

    for (const file of droppedFiles) {
      const validation = validateFontFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else if (validation.error) {
        errors.push(`${file.name}: ${validation.error}`)
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
    }

    if (validFiles.length > 0) {
      await addFiles(validFiles)
    }
  }

  const handleFileSelect = async () => {
    setValidationErrors([])

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.ttf,.otf,.woff,.woff2'

    input.onchange = async () => {
      const selectedFiles = Array.from(input.files || [])
      if (selectedFiles.length > 0) {
        const errors: string[] = []
        const validFiles: File[] = []

        for (const file of selectedFiles) {
          const validation = validateFontFile(file)
          if (validation.valid) {
            validFiles.push(file)
          } else if (validation.error) {
            errors.push(`${file.name}: ${validation.error}`)
          }
        }

        if (errors.length > 0) {
          setValidationErrors(errors)
        }

        if (validFiles.length > 0) {
          await addFiles(validFiles)
        }
      }
    }

    input.click()
  }

  const handleProcess = async () => {
    if (firstEntry) {
      await processFont(firstEntry.id)
    }
  }

  return (
    <div className="flex flex-col items-center p-6">
      <div
        data-testid="file-drop-zone"
        className={`w-full max-w-xl h-64 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 ${
          localDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <div className="text-center text-gray-600">
          <div className="mb-4 text-gray-400">
            <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2 text-gray-800">フォントファイルをドロップ</h3>
          <p className="mb-4 text-gray-500">TTF、OTF、WOFF、WOFF2ファイルに対応</p>
          <p className="mb-4 text-xs text-gray-400">最大ファイルサイズ: 100MB</p>
          <button
            type="button"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              handleFileSelect()
            }}
          >
            ファイルを選択
          </button>
        </div>
      </div>

      {/* ファイル情報表示 */}
      {firstEntry && (
        <div className="w-full max-w-xl mt-4 p-4 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{firstEntry.file.name}</p>
              <p className="text-sm text-gray-500">
                {firstEntry.status === 'analyzing' && '解析中...'}
                {firstEntry.status === 'ready' && `${(firstEntry.file.size / 1024 / 1024).toFixed(2)} MB`}
                {firstEntry.status === 'error' && `エラー: ${firstEntry.error}`}
              </p>
            </div>
            {isReady && !isProcessing && (
              <button
                type="button"
                onClick={handleProcess}
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                サブセット化
              </button>
            )}
          </div>
        </div>
      )}

      {/* バリデーションエラー表示 */}
      {validationErrors.length > 0 && (
        <div className="w-full max-w-xl mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">ファイルの問題</h4>
              <div className="mt-2 text-sm text-red-700">
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
  )
}
