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
    format: ['esm', 'cjs'],
    target: 'node18',
    outDir: 'dist',
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
