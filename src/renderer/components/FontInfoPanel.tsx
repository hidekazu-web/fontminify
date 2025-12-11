import React from 'react';
import { useFontStore } from '../stores/fontStore';
import { formatFileSize } from '../../shared/utils';

const FontInfoPanel: React.FC = () => {
  const { selectedFiles, fontAnalyses } = useFontStore();

  if (selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className="font-info-panel">
      <h3>フォント情報</h3>
      <div className="font-list">
        {selectedFiles.map((filePath, index) => {
          const analysis = fontAnalyses[filePath];
          
          return (
            <div key={filePath} className="font-item">
              <div className="font-item-header">
                <span className="font-name">
                  {analysis?.fileName || filePath.split('/').pop()}
                </span>
                <span className="font-size">
                  {analysis?.fileSize ? formatFileSize(analysis.fileSize) : ''}
                </span>
              </div>
              
              {analysis && (
                <div className="font-details">
                  <div className="detail-row">
                    <span className="label">フォントファミリー:</span>
                    <span className="value">{analysis.fontFamily}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">フォーマット:</span>
                    <span className="value">{analysis.format.toUpperCase()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">グリフ数:</span>
                    <span className="value">{analysis.glyphCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">可変フォント:</span>
                    <span className="value">{analysis.isVariableFont ? 'はい' : 'いいえ'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FontInfoPanel;