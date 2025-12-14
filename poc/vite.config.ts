import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname),
  server: {
    port: 3001,
    open: true,
    // node_modules内のWASMファイルへのアクセスを許可
    fs: {
      allow: [
        resolve(__dirname),
        resolve(__dirname, '../node_modules')
      ]
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
})
