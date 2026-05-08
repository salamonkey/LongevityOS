/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: vite.config.js
 * fabric_version: v1
 * generated_at_utc: 2026-05-05T18:11:21.498Z
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageJsonPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const appVersion = String(packageJson.version || '0.0.0');

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});
