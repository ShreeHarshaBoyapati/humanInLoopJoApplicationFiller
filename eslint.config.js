import { config as baseConfig } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: [
      // Dependencies
      '**/node_modules/**',
      '**/.pnpm/**',

      // Build outputs
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',

      // Turbo
      '**/.turbo/**',

      // IDE
      '**/.idea/**',
      '**/.vscode/**',

      // OS files
      '**/.DS_Store',

      // Environment files
      '**/.env',
      '**/.env.*',

      // Lock files
      '**/pnpm-lock.yaml',
      '**/package-lock.json',
      '**/yarn.lock',
    ],
  },
];
