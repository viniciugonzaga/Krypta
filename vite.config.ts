import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { readFileSync, rmSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

/**
 * Build do app desktop: tira o instalador (public/downloads) de dentro do app,
 * senão o .exe carregaria uma cópia dele mesmo.
 */
function semInstaladorNoApp(): Plugin {
  return {
    name: 'krypta-sem-instalador-no-app',
    apply: 'build',
    closeBundle() {
      rmSync(new URL('./dist/downloads', import.meta.url), { recursive: true, force: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'desktop' ? [semInstaladorNoApp()] : [])],
  // Versão do app (a mesma do package.json e do instalador .exe)
  define: {
    __KRYPTA_VERSION__: JSON.stringify(pkg.version),
  },
  // App desktop (Tauri): o "tauri dev" espera o Vite sempre na 5173
  // e não deve ter a tela do terminal limpa (para ver os erros do Rust)
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
}))
