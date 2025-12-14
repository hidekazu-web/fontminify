# FontMinify Web版対応 調査レポート

作成日: 2024年12月14日

## 概要

FontMinifyをElectronデスクトップアプリからWebアプリ化する際の技術調査結果をまとめる。

## 結論

**Web版対応は技術的に可能**

現在使用しているライブラリ（subset-font、fontkit）はどちらもブラウザで動作する。

---

## 現在の技術スタック

| ライブラリ | バージョン | 用途 | ブラウザ対応 |
|-----------|-----------|------|-------------|
| subset-font | ^2.4.0 | フォントサブセット化 | ✅ harfbuzzjs（WebAssembly）で動作 |
| fontkit | ^2.0.4 | フォント解析 | ✅ Chrome >= 70対応 |

### 現在のフォント処理フロー（Electron）

```
src/main/services/
├── fontAnalyzer.ts  - fontkit使用、fs.readFileSync依存
└── fontSubsetter.ts - subset-font使用、fs.readFileSync依存
```

---

## Web版実装の選択肢

### 選択肢1: 完全クライアントサイド（推奨）

**特徴**: サーバーでの処理不要、全処理をブラウザで実行

#### アーキテクチャ

```
ブラウザ
├── React UI（既存のrendererコードを流用）
├── Web Worker（フォント処理）
│   ├── harfbuzzjs (WASM) - サブセット化
│   ├── fontkit - 解析
│   └── woff2 encoder - 圧縮
└── File System Access API / ダウンロード
```

#### メリット

- 静的ホスティングで運用可能（無料プランで対応可能）
- プライバシー完全保護（フォントがサーバーに送信されない）
- オフライン対応可能（PWA化）
- スケーラビリティ（各ユーザーが自分のブラウザで処理）

#### デメリット

- 初回ロード時にWASMダウンロード（~750KB gzipped）
- 大きなフォント処理時のブラウザメモリ制限
- 古いブラウザは非対応

#### 実績

[Excalidraw](https://github.com/excalidraw/excalidraw/pull/8384)が2024年に同様のアプローチで実装済み。
harfbuzzjs + woff2 encoder を使用し、最大95%のフォントサイズ削減を実現。

---

### 選択肢2: サーバーサイド処理

**特徴**: 現在のElectronメインプロセスのコードをそのままサーバーで実行

#### アーキテクチャ

```
ブラウザ ─(フォントアップロード)─→ API Server (Node.js)
                                    ├── subset-font
                                    ├── fontkit
                                    └── ファイル生成
         ←(処理済みフォント)────────┘
```

#### メリット

- 既存コード（src/main/services/）をほぼそのまま利用可能
- 大きなフォントも安定して処理可能
- ブラウザ互換性の心配が少ない

#### デメリット

- サーバー運用コスト（Compute必要）
- フォントデータのアップロード/ダウンロード通信
- プライバシー懸念（ユーザーのフォントがサーバーに送信される）
- スケール時にサーバー増強が必要

---

### 選択肢3: ハイブリッド

**特徴**: 基本はクライアント処理、大きなファイルや古いブラウザのみサーバー処理

#### アーキテクチャ

```
ブラウザ
├── WASM対応 & 小さいフォント → クライアント処理
└── 非対応 or 大きいフォント → サーバーにフォールバック
```

#### メリット

- 最適なパフォーマンス
- 幅広いブラウザ対応

#### デメリット

- 実装が複雑
- 両方のインフラ管理が必要

---

## ホスティングコスト比較

### 選択肢1（クライアントサイド）

静的ファイル（HTML/JS/CSS/WASM）の配信のみ。

| ホスティング先 | 費用 | 特徴 |
|--------------|------|------|
| GitHub Pages | 無料 | 静的サイトのみ、帯域制限あり |
| Vercel | 無料枠あり | 静的サイト向き、100GB/月 |
| Netlify | 無料枠あり | 静的サイト向き、100GB/月 |
| Cloudflare Pages | 無料 | 帯域無制限 |

**想定コスト**: 無料〜月数百円

### 選択肢2（サーバーサイド）

Node.jsサーバーでフォント処理を実行。

| 必要リソース | 理由 |
|-------------|------|
| CPU | サブセット化・圧縮処理 |
| メモリ | 10MB超のフォントを展開 |
| ストレージ | 一時ファイル保存 |
| 常時稼働 | リクエストを受け付ける |

| ホスティング先 | 費用目安 | 特徴 |
|--------------|---------|------|
| Vercel Functions | 従量課金 | 実行時間制限あり |
| AWS Lambda | 従量課金 | メモリ/時間で課金 |
| Cloud Run | 従量課金 | コンテナベース |
| VPS (さくら等) | 月額1,000円〜 | 自由度高い |

**想定コスト**: 月数百〜数千円（利用量による）

---

## 必要な変更点（選択肢1の場合）

### コード変更

| 現在（Electron） | Web版 |
|-----------------|-------|
| `fs.readFileSync()` | `FileReader` / File API |
| `Buffer` | `Uint8Array` |
| メインプロセス処理 | Web Worker |
| ファイル保存 | File System Access API / Blob Download |

### 既存コードの流用度

| ディレクトリ | 流用度 | 備考 |
|-------------|-------|------|
| `src/renderer/` | 90% | ほぼそのまま利用可能 |
| `src/shared/` | 100% | そのまま利用可能 |
| `src/main/services/` | 60% | Buffer→Uint8Array変換が必要 |
| `src/main/ipc/` | 0% | Web Worker通信に置き換え |

---

## 推奨アプローチ

**選択肢1（完全クライアントサイド）** を推奨。

### 理由

1. **技術的に実証済み**: Excalidrawが同様の実装を成功させている
2. **コスト効率**: サーバー運用不要で無料〜低コストで運用可能
3. **プライバシー**: 日本語フォントは機密性が高い場合が多く、ローカル処理が安心
4. **スケーラビリティ**: ユーザー増加時もインフラ増強不要

### 実装ステップ（概要）

1. Viteでブラウザ向けビルド設定を追加
2. フォント処理をWeb Workerに移植
3. Buffer→Uint8Array変換
4. File System Access API / ダウンロード対応
5. PWA化（オプション）

---

## PoC検証結果（2024-12-14）

### 発見した課題

**subset-fontライブラリはNode.js専用**

調査時点では「harfbuzzjs（WebAssembly）で動作」と記載していたが、実際にブラウザで動作確認したところ、`subset-font`ライブラリ自体が`require('fs')`に依存しており、そのままではブラウザで動作しないことが判明した。

```javascript
// subset-font/index.js（抜粋）
const { readFile } = require('fs').promises;  // ← Node.js専用
```

### 解決策

**harfbuzzjs (WASM) を直接使用する**

`subset-font`が内部で使用している`harfbuzzjs`のWASMファイル（`hb-subset.wasm`）を直接ブラウザから呼び出すことで、サブセット化処理が可能。

```typescript
// ブラウザでのWASM読み込み
const response = await fetch('harfbuzzjs/hb-subset.wasm')
const wasmBuffer = await response.arrayBuffer()
const { instance } = await WebAssembly.instantiate(wasmBuffer)
const exports = instance.exports

// サブセット化処理
const fontBuffer = exports.malloc(fontData.byteLength)
// ... harfbuzz API を直接呼び出し
```

### テスト結果

| 項目 | 結果 |
|-----|------|
| テストフォント | NotoSans-Regular.ttf |
| 元サイズ | 543.2 KB |
| サブセット後 | 10.3 KB |
| **削減率** | **98.1%** |
| 処理時間 | 0.01秒 |
| WASM サイズ | 580.3 KB |

### 結論

**Web版対応は技術的に実現可能**（実証済み）

- harfbuzzjs (WASM) はブラウザで正常に動作する
- 処理速度は非常に高速（0.01秒）
- 98%以上のサイズ削減が可能
- `subset-font`ライブラリは使用せず、`harfbuzzjs`を直接使用する設計に変更が必要

### WOFF2出力について

harfbuzzjs はサブセット化のみを行い、出力形式はTTF。WOFF2形式で出力するには、別途WOFF2エンコーダーが必要。

**処理パイプライン**:
```
入力フォント → harfbuzzjs (サブセット化) → TTF → woff2-encoder → WOFF2
```

**利用可能なWOFF2エンコーダー**:
- `woff2-encoder` (npm) - WASM対応、ブラウザで動作
- `fonteditor-core` - 包括的なフォント処理ライブラリ

**結論**: Web版でもWOFF2出力は可能。別途ライブラリ追加が必要だが、技術的な障壁はない。

### PoCコード

検証に使用したコードは `poc/` ディレクトリに保存:

```
poc/
├── index.html      # テストUI
├── main.ts         # harfbuzzjs直接呼び出し実装
└── vite.config.ts  # Vite設定
```

実行方法: `npm run poc`

---

## 参考リンク

- [subset-font - npm](https://www.npmjs.com/package/subset-font)
- [fontkit - GitHub](https://github.com/foliojs/fontkit)
- [Excalidraw Font Subsetting PR #8384](https://github.com/excalidraw/excalidraw/pull/8384)
- [harfbuzzjs - GitHub](https://github.com/nicolo-ribaudo/nicolo-ribaudo.github.io)
- [File System Access API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2024-12-14 | 初版作成 |
| 2024-12-14 | PoC検証結果を追加。subset-fontがNode.js専用であることを発見、harfbuzzjs直接使用で解決 |
| 2024-12-14 | WOFF2出力について追記。woff2-encoderライブラリでWOFF2出力が可能であることを確認 |
