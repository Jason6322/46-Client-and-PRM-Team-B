import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/components/ui/**', // shadcn components — not hand-authored
        '**/*.d.ts',
        '**/*.config.*',
        'src/app/**', // pages tested via E2E, not unit tests
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Unit tests exercise Server Component modules, so resolve the
      // 'server-only' marker to its react-server (no-op) build instead of the
      // client build, which throws on import.
      'server-only': resolve(__dirname, '../node_modules/server-only/empty.js'),
    },
  },
})
