/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: { port: 3000, host: '0.0.0.0' },
    resolve: {
      alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      testTimeout: 15000,
    },
  }
})
