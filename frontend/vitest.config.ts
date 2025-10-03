import { defineConfig } from 'vitest/config';

// Keep vitest isolated from Vite dev server settings (proxies/ports)
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts'
  }
});
