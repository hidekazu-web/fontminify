# FontMinify

日本語フォントのサブセット化・最適化を行うmacOSデスクトップアプリ。
Electron + React + TypeScript構成、ファイルサイズ90%以上削減。

## 技術スタック

- Electron 34 + React 18 + TypeScript 5.8
- 状態管理: Zustand / スタイル: Tailwind CSS
- フォント処理: subset-font, fontkit
- テスト: Vitest, Playwright / ビルド: Vite, electron-builder

## コマンド

```bash
npm run dev          # 開発モード
npm run build        # プロダクションビルド
npm run typecheck    # 型チェック
npm run lint         # リンティング
npm test             # テスト実行
npm run dist:mac     # macOS用DMG作成
```

## アーキテクチャ

```
src/
├── main/           # Electronメインプロセス（フォント処理）
├── renderer/       # Reactレンダラー（UI）
├── shared/         # 共有型定義
└── lib/            # フォント処理ライブラリ
```

## IPC通信

```typescript
// メインプロセス
ipcMain.handle(IPCChannel.ANALYZE_FONT, async (_, filePath) => analyzeFont(filePath));

// レンダラープロセス
const fontInfo = await window.api.analyzeFont(filePath);
```

## フォント処理フロー

1. ファイル検証（TTF/OTF/WOFF/WOFF2）
2. フォント解析（メタデータ・グリフ数）
3. 文字セット選択（プリセット/カスタム）
4. サブセット化 → WOFF2圧縮 → 保存

## 文字セットプリセット

| プリセット | 文字数 | 内容 |
|-----------|--------|------|
| 最小 | ~200 | ひらがな・カタカナ・英数字・記号 |
| 基本 | ~1,000 | 上記 + 教育漢字 |
| 標準 | ~2,100 | 上記 + 常用漢字 |
| JIS第1水準 | ~3,000 | JIS X 0208第1水準 |

## セキュリティ

- コンテキスト分離: 有効
- Node統合: 無効（レンダラー）
- CSPヘッダー: 設定済み

## パフォーマンス目標

- 10MBフォント処理: <10秒
- メモリ: <300MB
- UI: 60fps維持

## 管理ドキュメント

- 進捗状況: docs/progress.md を参照
- 課題一覧: docs/issues.md を参照
- タスク詳細: docs/task-list.md を参照
- 機能仕様: docs/specs.md を参照（詳細仕様が必要な場合）

## タスク管理ルール

### タスク進捗時（IMPORTANT: 必ず実行）
1. **開始時**: TodoWriteで`in_progress`に変更
2. **完了時**:
   - TodoWriteで`completed`に変更
   - docs/progress.md の該当タスクにチェック
   - docs/progress.md の「更新履歴」に記録
   - docs/task-list.md の状態を「完了」に更新

### 課題発見時（IMPORTANT: 必ず実行）
1. docs/issues.md に課題を追加（テンプレート使用）
2. 優先度を設定（P0: 緊急 / P1: 重要 / P2: 低）
3. 統計セクションを更新
4. 関連タスクがあれば docs/progress.md にも記載

## 重要事項

- IMPORTANT: フォント処理は必ずメインプロセスで実行
- IMPORTANT: 大きなフォントは非同期ストリーム処理
- NEVER: レンダラーで直接ファイルシステムにアクセスしない
