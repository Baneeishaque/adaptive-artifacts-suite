import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      enabled: true,
      reporter: ['text', 'lcov']
    },
    globals: true
  }
});
