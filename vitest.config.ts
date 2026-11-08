import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', include: ['tests/**/*.test.tsx'], env: { VITE_TURNSTILE_SITE_KEY: 'unit-test-only' } },
})
