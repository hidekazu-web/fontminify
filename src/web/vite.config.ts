import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  base: './',
  publicDir: resolve(__dirname, '../../public'),
  build: {
    outDir: resolve(__dirname, '../../dist-web'),
    emptyOutDir: true,
    // 圧縮最適化（esbuildを使用）
    minify: 'esbuild',
    // チャンク分割戦略
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          // Reactとzustandを分離
          'vendor-react': ['react', 'react-dom', 'zustand']
        }
      }
    },
    // ソースマップ無効（プロダクション）
    sourcemap: false,
    // チャンク警告サイズ
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../'),
      '@web': resolve(__dirname, './'),
      '@shared': resolve(__dirname, '../shared'),
      '@lib': resolve(__dirname, '../lib'),
      '@renderer': resolve(__dirname, '../renderer')
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['harfbuzzjs']
  },
  server: {
    port: 5176
  }
})
