import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    target: 'node18',
    outDir: 'dist',
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
  },
  // CLI entry
  {
    entry: { cli: 'src/cli/main.ts' },
    format: ['cjs'],
    target: 'node18',
    outDir: 'dist',
    dts: false,
    sourcemap: false,
    clean: false,
    splitting: false,
    bundle: true,
    minify: true,
    treeshake: true,
    // 只打包必需的依赖
    noExternal: [
      '@inquirer/prompts',
      '@inquirer/checkbox',
      '@inquirer/confirm',
      '@inquirer/input', 
      '@inquirer/select',
      '@iarna/toml',
      'commander',
      'supports-color',
      'zod'
    ],
    external: [
      'fs', 'path', 'os', 'child_process', 'url', 'util'
    ],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
