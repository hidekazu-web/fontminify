import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

async function globalSetup() {
  console.log('E2Eテスト用のセットアップを開始...');

  try {
    // アプリケーションをビルド
    console.log('アプリケーションをビルド中...');
    await execAsync('npm run build');
    console.log('ビルド完了');

    // テスト用のデータ準備
    console.log('テストデータの準備...');
    // 必要に応じてテスト用フォントファイルやデータを準備

    console.log('セットアップ完了');
  } catch (error) {
    console.error('セットアップ中にエラーが発生:', error);
    throw error;
  }
}

export default globalSetup;