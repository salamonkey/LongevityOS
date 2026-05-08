/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: vitest.config.ts
 * fabric_version: v1
 * generated_at_utc: 2026-05-05T18:11:21.498Z
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
