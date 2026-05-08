/* generated_from: fabric/company/v1/runtime/product/storybook.mjs
 * target: .storybook/main.ts
 * generated_at_utc: 2026-05-05T18:22:06.091Z
 */
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
