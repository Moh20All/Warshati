import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))

export default defineConfig(({ command, mode }) => {
  // The license server address is baked into the main bundle at build time:
  // an installed app has no .env file, so reading process.env at runtime would give ''.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env to build (license server).')
  }

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: {
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
      }
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
  }
})
