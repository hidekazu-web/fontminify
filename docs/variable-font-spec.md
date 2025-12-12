# バリアブルフォント対応 仕様書

最終更新: 2025-12-12

## 概要

バリアブルフォント（Variable Font）の検出、軸情報の表示、サブセット化時の軸値指定機能を追加する。

## バリアブルフォントとは

バリアブルフォントは、単一のフォントファイル内に複数の「軸」（axes）を持ち、太さ・幅・傾きなどを連続的に変化させることができるフォント形式。OpenType 1.8で規格化された。

### 主な軸タグ

| タグ | 名前 | 説明 | 典型的な範囲 |
|------|------|------|--------------|
| `wght` | Weight | 太さ | 100-900 |
| `wdth` | Width | 幅 | 50-200 |
| `slnt` | Slant | 傾き | -90-90 |
| `ital` | Italic | イタリック | 0-1 |
| `opsz` | Optical Size | 光学サイズ | 6-144 |

## 実装タスク

### タスク1: 型定義の更新
- **ファイル**: `src/shared/types.ts`
- **状態**: [x] 完了
- **内容**:
  - `VariableAxis` インターフェースの定義
  - `FontAnalysis` に `isVariableFont` と `variableAxes` を追加
  - `SubsetOptions` に `variationAxes` オプションを追加

```typescript
interface VariableAxis {
  tag: string;      // 'wght', 'wdth' など
  name: string;     // 表示名
  min: number;      // 最小値
  max: number;      // 最大値
  default: number;  // デフォルト値
}

interface FontAnalysis {
  // 既存フィールド...
  isVariableFont: boolean;
  variableAxes?: VariableAxis[];
}

interface SubsetOptions {
  // 既存フィールド...
  variationAxes?: Record<string, number>; // { wght: 400, wdth: 100 }
  pinVariationAxes?: boolean; // 軸値を固定するか
}
```

### タスク2: フォント解析の強化
- **ファイル**: `src/main/services/fontAnalyzer.ts`
- **状態**: [x] 完了
- **内容**:
  - fontkitを使用してfvarテーブルを解析
  - バリアブルフォントの検出ロジック追加
  - 軸情報の抽出

```typescript
// fontkit の variationAxes プロパティを使用
const font = fontkit.openSync(filePath);
const isVariableFont = font.variationAxes && Object.keys(font.variationAxes).length > 0;
const variableAxes = isVariableFont
  ? Object.entries(font.variationAxes).map(([tag, axis]) => ({
      tag,
      name: axis.name,
      min: axis.min,
      max: axis.max,
      default: axis.default,
    }))
  : undefined;
```

### タスク3: サブセット処理の更新
- **ファイル**: `src/main/services/fontSubsetter.ts`
- **状態**: [x] 完了
- **内容**:
  - `variationAxes` オプションをsubset-fontに渡す
  - 軸値の固定/範囲維持の切り替え

```typescript
const subsetFontBuffer = await subsetFontLib(fontBuffer, characterSet, {
  targetFormat: targetFormat,
  preserveHinting: !options.removeHinting,
  variationAxes: options.variationAxes, // 軸値を固定する場合
});
```

### タスク4: UIコンポーネント作成
- **ファイル**: `src/renderer/components/VariableAxisControl.tsx`（新規）
- **状態**: [x] 完了
- **内容**:
  - 各軸のスライダーコントロール
  - 最小値・最大値・現在値の表示
  - プリセット選択（Regular, Bold等）

### タスク5: FontInfoPanelの更新
- **ファイル**: `src/renderer/components/FontInfoPanel.tsx`
- **状態**: [x] 完了
- **内容**:
  - バリアブルフォントバッジの表示
  - 軸情報の一覧表示
  - VariableAxisControlの組み込み

### タスク6: ストアの更新
- **ファイル**: `src/renderer/stores/fontStore/state.ts`, `actions.ts`
- **状態**: [x] 完了
- **内容**:
  - 選択された軸値の状態管理
  - デフォルト値へのリセット機能

---

## 動作フロー

```
1. ユーザーがフォントをドロップ
    ↓
2. fontAnalyzer が fvar テーブルを検出
    ↓
3. isVariableFont = true の場合
    ↓
4. FontInfoPanel にバリアブルフォントバッジ表示
    ↓
5. VariableAxisControl で各軸のスライダー表示
    ↓
6. ユーザーが軸値を調整（任意）
    ↓
7. サブセット化実行
    ↓
8. 指定された軸値で固定 or 全範囲を維持
```

---

## UI設計

### FontInfoPanel 表示例

```
┌─────────────────────────────────────────┐
│ NotoSansJP-VF.ttf                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ファミリー: Noto Sans JP                │
│ スタイル: Variable                      │
│ グリフ数: 17,000                        │
│ ファイルサイズ: 8.5 MB                  │
│                                         │
│ [Variable Font] ← バッジ               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 軸設定                              │ │
│ │                                     │ │
│ │ Weight (wght)                       │ │
│ │ 100 ────●──────────────────── 900   │ │
│ │         400                         │ │
│ │                                     │ │
│ │ Width (wdth)                        │ │
│ │ 75 ─────────●──────────────── 125   │ │
│ │             100                     │ │
│ │                                     │ │
│ │ [ ] 軸値を固定してサイズ削減        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 注意事項

### サイズへの影響

| オプション | サイズ削減効果 | 説明 |
|------------|---------------|------|
| 軸値を固定 | 高い | 単一インスタンスに変換、余分なデータ削除 |
| 範囲を維持 | 低い | バリアブル機能を保持、サイズ削減は限定的 |

### 推奨設定

- **Webフォント用途**: 軸値を固定（使用するウェイトのみ）
- **デザインツール用途**: 範囲を維持（柔軟性重視）

---

## 進捗状況

| タスク | 状態 | 完了日 |
|--------|------|--------|
| 1. 型定義の更新 | [x] 完了 | 2025-12-12 |
| 2. フォント解析の強化 | [x] 完了 | 2025-12-12 |
| 3. サブセット処理の更新 | [x] 完了 | 2025-12-12 |
| 4. UIコンポーネント作成 | [x] 完了 | 2025-12-12 |
| 5. FontInfoPanelの更新 | [x] 完了 | 2025-12-12 |
| 6. ストアの更新 | [x] 完了 | 2025-12-12 |
| 7. ビルド・動作確認 | [x] 完了 | 2025-12-12 |

---

## 参考資料

- [OpenType Font Variations Overview](https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview)
- [subset-font npm](https://www.npmjs.com/package/subset-font)
- [fontkit GitHub](https://github.com/foliojs/fontkit)
