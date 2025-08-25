import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/*.test.js'],
    globals: true,
    reporters: 'default',
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js']
    }
  }
});
