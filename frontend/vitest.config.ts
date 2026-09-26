import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import { dirname, resolve } from 'path'

// Unit tests exercise Server Component modules, so the 'server-only' marker is
// resolved to its react-server (no-op) build instead of the client build, which
// throws on import.
//
// Where pnpm puts the package depends on the pnpm version: .npmrc sets
// node-linker=hoisted, which pnpm 10 (CI, Vercel) honours — the package lands in
// the root node_modules — while pnpm 11 ignores .npmrc and links it under
// frontend/node_modules. Hard-coding either path breaks the other, so let Node
// find the package, then take empty.js from beside it. (The exports map only
// exposes ".", so require.resolve('server-only/empty.js') is blocked.)
const serverOnlyEmpty = resolve(
  dirname(createRequire(import.meta.url).resolve('server-only')),
  'empty.js'
)

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
      'server-only': serverOnlyEmpty,
    },
  },
})
