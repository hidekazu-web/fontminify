# Test Fonts Directory

このディレクトリには、FontMinifyアプリケーションのテスト用フォントファイルを配置します。

## テスト用フォントファイルについて

テストで使用されるフォントファイルは、ライセンスや配布の問題により、このリポジトリには含まれていません。
テストを実行する前に、以下のフォントファイルを手動で配置してください：

### 必要なフォントファイル

1. **Noto Sans CJK JP**
   - ファイル名: `NotoSansCJKjp-Regular.otf`
   - ダウンロード: [Google Fonts Noto](https://fonts.google.com/noto)
   - 配置場所: `/test/NotoSansCJKjp-Regular.otf`

2. **Noto Serif CJK JP**
   - ファイル名: `NotoSerifCJKjp-Regular.otf`
   - ダウンロード: [Google Fonts Noto](https://fonts.google.com/noto)
   - 配置場所: `/test/NotoSerifCJKjp-Regular.otf`

3. **macOS システムフォント**
   - 游ゴシック: `/System/Library/Fonts/YuGothic.ttc`
   - 游明朝: `/System/Library/Fonts/YuMincho.ttc`
   - ヒラギノ角ゴシック: `/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc`

## テスト実行方法

フォントファイルを配置後、以下のコマンドでテストを実行：

```bash
npm test
```

## 注意事項

- フォントファイルは著作権で保護されている場合があります
- 商用利用の場合は、適切なライセンスを確認してください
- テスト用途のみでの使用に留めてください