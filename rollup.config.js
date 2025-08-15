
import { defineConfig } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'

export default defineConfig({
  input: 'lib/monk.mjs',
  output: [
    {
      file: 'dist/monk.cjs',
      format: 'cjs',
      exports: 'named'
    },
    {
      file: 'dist/monk.mjs',
      format: 'esm'
    }
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({ babelHelpers: 'bundled', extensions: ['.js', '.mjs'] })
  ],
  external: ['mongodb', 'debug']
})
