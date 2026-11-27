import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Carpeta del proyecto con la letra de la unidad SIEMPRE en mayúscula (Windows).
// VS Code abre la terminal en "c:\..." y otras herramientas en "C:\...": Rolldown
// (Vite 8) tomaba las dos formas como archivos distintos y metía React DOS veces
// en el bundle; la app quedaba en blanco ("Cannot read properties of null
// (reading 'useCallback')"). Visto el 26-nov: según desde dónde se compilara,
// salía bien o roto. El resolvedor de Rolldown usa la mayúscula; con la raíz y
// el alias "@" igual, todo queda con una sola forma.
const PROJECT_DIR = import.meta.dirname.replace(/^[a-z]:/, (drive) => drive.toUpperCase())

// https://vite.dev/config/
export default defineConfig({
  root: PROJECT_DIR,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(PROJECT_DIR, './src'),
    },
  },
  server: {
    port: 4250,
    strictPort: true,
  },
})
