async function globalTeardown() {
  console.log('E2Eテスト後のクリーンアップを開始...');

  try {
    // テスト中に作成された一時ファイルを削除
    console.log('一時ファイルのクリーンアップ...');
    
    // 必要に応じてテスト環境のクリーンアップ処理を追加

    console.log('クリーンアップ完了');
  } catch (error) {
    console.error('クリーンアップ中にエラーが発生:', error);
    // teardownのエラーはテスト結果に影響しないように継続
  }
}

export default globalTeardown;