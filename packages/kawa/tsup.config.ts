import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/rivetkit/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'rivetkit'],
});
