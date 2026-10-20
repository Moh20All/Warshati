import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    // App version for feedback/crash reports, always taken from package.json
    define: { __APP_VERSION__: JSON.stringify(version) },
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [tailwindcss(), react()]
  }
})
