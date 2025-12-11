# FontMinify - フォント軽量化macOSアプリケーション要件定義書

## 1. プロジェクト概要

### 1.1 基本情報
- **プロジェクト名**: FontMinify
- **バージョン**: 1.0.0
- **開発言語**: TypeScript + JavaScript
- **フレームワーク**: Electron + React
- **対象OS**: macOS 11.0以降（初期版）
- **開発期間**: 4週間

### 1.2 プロジェクト構造
```
fontminify/
├── src/
│   ├── main/                 # Electronメインプロセス
│   │   ├── index.ts         # エントリーポイント
│   │   ├── ipc/             # IPC通信ハンドラー
│   │   ├── menu/            # メニューバー設定
│   │   └── utils/           # ユーティリティ関数
│   ├── renderer/            # Reactフロントエンド
│   │   ├── App.tsx          # メインコンポーネント
│   │   ├── components/      # UIコンポーネント
│   │   ├── hooks/           # カスタムフック
│   │   ├── store/           # 状態管理
│   │   └── styles/          # スタイルシート
│   ├── shared/              # 共有型定義・定数
│   └── lib/                 # フォント処理ライブラリ
│       ├── subset/          # サブセット化ロジック
│       ├── analyze/         # フォント解析
│       └── presets/         # 文字セットプリセット
├── tests/                   # テストファイル
├── assets/                  # アイコン・画像リソース
├── scripts/                 # ビルドスクリプト
├── package.json
├── electron-builder.yml     # ビルド設定
├── tsconfig.json
├── .eslintrc.js
└── README.md
```

## 2. 詳細機能要件

### 2.1 フォント入力機能

#### ドラッグ&ドロップ
```typescript
interface DropZoneProps {
  onFileDrop: (files: File[]) => void;
  maxFiles: number; // 10
  acceptedFormats: string[]; // ['.ttf', '.otf', '.woff', '.woff2']
  maxFileSize: number; // 100MB
}
```

#### ファイル検証
- ファイル形式チェック（マジックナンバー確認）
- ファイルサイズ制限（100MB）
- フォント破損チェック
- 重複ファイル検出

### 2.2 フォント解析機能

#### 解析項目
```typescript
interface FontAnalysis {
  fileName: string;
  fileSize: number;
  format: 'ttf' | 'otf' | 'woff' | 'woff2';
  fontFamily: string;
  fontSubfamily: string;
  version: string;
  glyphCount: number;
  characterRanges: CharacterRange[];
  features: OpenTypeFeature[];
  languages: string[];
  hasColorEmoji: boolean;
  isVariableFont: boolean;
  axes?: VariableAxis[];
}
```

### 2.3 文字セット管理

#### プリセット定義
```typescript
interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  characterCount: number;
  characters: string;
  categories: CharCategory[];
}

const presets: CharacterPreset[] = [
  {
    id: 'minimal',
    name: '最小セット',
    description: 'ひらがな・カタカナ・英数字・基本記号',
    characterCount: 200,
    characters: '...',
    categories: ['hiragana', 'katakana', 'ascii', 'symbols']
  },
  // ... 他のプリセット
];
```

#### カスタム文字セット
- テキスト直接入力
- テキストファイル読み込み（.txt）
- HTMLファイルから抽出
- 使用済み文字の記憶機能

### 2.4 サブセット化エンジン

#### 処理オプション
```typescript
interface SubsetOptions {
  characters: string;
  format: OutputFormat;
  preserveFeatures: {
    kerning: boolean;
    ligatures: boolean;
    hinting: boolean;
    verticalMetrics: boolean;
  };
  optimizations: {
    removeUnusedGlyphs: boolean;
    optimizeCFF: boolean;
    compressWOFF2: boolean;
  };
}
```

#### 処理フロー
1. フォントファイル読み込み
2. 文字セット検証
3. グリフ抽出
4. メタデータ最適化
5. フォーマット変換
6. 圧縮処理
7. ファイル出力

### 2.5 プログレス管理

```typescript
interface ProgressState {
  phase: 'idle' | 'analyzing' | 'subsetting' | 'optimizing' | 'complete';
  progress: number; // 0-100
  currentFile: string;
  totalFiles: number;
  processedFiles: number;
  estimatedTime: number; // seconds
  errors: ProcessError[];
}
```

## 3. UI/UX詳細設計

### 3.1 画面構成

#### メイン画面レイアウト
```
┌─────────────────────────────────────────────┐
│ FontMinify                          ⚙️ − □ × │
├─────────────────────────────────────────────┤
│ ┌───────────────┬─────────────────────────┐ │
│ │               │                         │ │
│ │  ドロップ     │  フォント情報           │ │
│ │  エリア       │  ・ファミリー: Noto Sans │ │
│ │               │  ・サイズ: 15.2MB       │ │
│ │               │  ・グリフ数: 65,535     │ │
│ │               │                         │ │
│ └───────────────┴─────────────────────────┘ │
│                                             │
│ 文字セット選択                              │
│ ┌─────────────────────────────────────────┐ │
│ │ ◉ 標準セット（常用漢字）               │ │
│ │ ○ 最小セット ○ 基本セット ○ JIS第1水準 │ │
│ │ ○ カスタム [テキストを入力...]         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 詳細オプション ▼                            │
│                                             │
│ 推定結果: 15.2MB → 1.2MB (92%削減)         │
│                                             │
│ [キャンセル]              [軽量化を実行 →]  │
└─────────────────────────────────────────────┘
```

#### プログレス画面
```
┌─────────────────────────────────────────────┐
│ 処理中...                                   │
├─────────────────────────────────────────────┤
│                                             │
│  フォントを軽量化しています                 │
│                                             │
│  NotoSansJP-Regular.otf                     │
│  ████████████████████░░░░░  75%            │
│                                             │
│  フェーズ: グリフを最適化中                 │
│  処理時間: 00:08 / 推定残り時間: 00:03     │
│                                             │
│  ファイル 2/3                               │
│                                             │
│                    [キャンセル]             │
└─────────────────────────────────────────────┘
```

### 3.2 インタラクション設計

#### ドラッグ&ドロップ
- ドラッグオーバー時: 青い枠線でハイライト
- 非対応ファイル: 赤い枠線 + シェイクアニメーション
- 複数ファイル: バッジで個数表示

#### リアルタイムプレビュー
- 文字セット変更時に即座にサイズ推定
- 含まれる文字のプレビュー表示
- 削減率のビジュアル表示（円グラフ）

## 4. 技術実装仕様

### 4.1 依存関係
```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@fontsource/subset-font": "^5.0.0",
    "fontkit": "^2.0.0",
    "wawoff2": "^2.0.1",
    "zustand": "^4.4.0",
    "react-dropzone": "^14.2.0",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "electron-builder": "^24.0.0",
    "@types/react": "^18.2.0",
    "vitest": "^1.0.0"
  }
}
```

### 4.2 ビルド設定
```yaml
# electron-builder.yml
appId: com.fontminify.app
productName: FontMinify
directories:
  output: dist
  buildResources: build
mac:
  category: public.app-category.developer-tools
  icon: assets/icon.icns
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
  notarize:
    teamId: "YOUR_TEAM_ID"
dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
```

### 4.3 IPC通信設計
```typescript
// IPCチャンネル定義
enum IPCChannel {
  SELECT_FILES = 'select-files',
  ANALYZE_FONT = 'analyze-font',
  SUBSET_FONT = 'subset-font',
  SAVE_FILE = 'save-file',
  PROGRESS_UPDATE = 'progress-update',
  ERROR = 'error'
}

// メインプロセス側
ipcMain.handle(IPCChannel.ANALYZE_FONT, async (event, filePath: string) => {
  return await analyzeFont(filePath);
});

// レンダラープロセス側
const fontInfo = await ipcRenderer.invoke(IPCChannel.ANALYZE_FONT, filePath);
```

## 5. エラー処理とログ

### 5.1 エラー分類
```typescript
enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  CORRUPT_FONT = 'CORRUPT_FONT',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUBSET_FAILED = 'SUBSET_FAILED'
}

interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  actions?: ErrorAction[];
}
```

### 5.2 ログ設計
- アプリケーションログ: `~/Library/Logs/FontMinify/`
- デバッグモード: 環境変数で制御
- クラッシュレポート: Sentry統合（オプション）

## 6. テスト戦略

### 6.1 単体テスト
```typescript
// フォント解析テスト
describe('FontAnalyzer', () => {
  it('should correctly identify font format', async () => {
    const result = await analyzeFont('test.ttf');
    expect(result.format).toBe('ttf');
  });
});
```

### 6.2 統合テスト
- Electron環境でのE2Eテスト
- 実際のフォントファイルを使用した処理テスト
- メモリリークテスト

## 7. パフォーマンス目標

| 項目 | 目標値 |
|------|--------|
| 起動時間 | < 2秒 |
| 10MBフォント処理 | < 10秒 |
| メモリ使用量 | < 300MB |
| CPU使用率 | < 80% |

## 8. セキュリティ要件

- コンテキストアイソレーション有効化
- nodeIntegration無効化
- CSP（Content Security Policy）設定
- 自動アップデート時の署名検証

## 9. 配布とアップデート

### 9.1 配布方法
1. **GitHub Releases**: DMGファイル配布
2. **Homebrew Cask**: `brew install --cask fontminify`
3. **将来的にMac App Store**

### 9.2 自動アップデート
```typescript
// electron-updater統合
autoUpdater.checkForUpdatesAndNotify();
```

## 10. 開発スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Week 1 | 5日 | 基本構造・UI実装 |
| Week 2 | 5日 | フォント処理実装 |
| Week 3 | 5日 | 最適化・エラー処理 |
| Week 4 | 5日 | テスト・ビルド・配布準備 |

## 11. 成功指標

### 11.1 機能面
- [ ] 主要フォント形式（TTF/OTF/WOFF/WOFF2）の処理成功率 > 99%
- [ ] 日本語フォントの平均削減率 > 90%
- [ ] 処理後のフォント表示品質の維持

### 11.2 ユーザビリティ
- [ ] 3クリック以内で処理完了
- [ ] エラー発生率 < 1%
- [ ] ユーザー満足度 > 4.5/5.0

### 11.3 技術面
- [ ] テストカバレッジ > 80%
- [ ] ビルドサイズ < 100MB
- [ ] クラッシュフリー率 > 99.9%

## 12. 将来の拡張計画

### Phase 2（v1.1）
- Windows/Linux対応
- バッチ処理の高度化
- プロファイル機能

### Phase 3（v2.0）
- Web版の開発
- クラウド同期
- API提供

## 13. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| フォントライセンス問題 | 高 | ライセンス保持オプション実装 |
| 処理速度の遅延 | 中 | Web Worker活用 |
| メモリ不足 | 中 | ストリーミング処理実装 |

## 14. 用語集

- **サブセット化**: フォントから必要な文字だけを抽出すること
- **グリフ**: フォント内の個々の文字の形状データ
- **OpenType機能**: カーニング、リガチャなどの高度な組版機能
- **WOFF2**: Web用に最適化されたフォント圧縮形式

---

作成日: 2025-07-25  
バージョン: 1.0  
作成者: FontMinify開発チーム