import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";
import json from "@rollup/plugin-json";

const commonConfig = {
  input: "lib/monk.mjs",
  external: ['object-assign', 'debug', 'mongodb', 'events', 'tty', 'util', 'os'],
  output: {
    name: "monk",
    sourcemap: true,
    exports: 'named',
    globals: {
      TextEncoder: 'TextEncoder',
      TextDecoder: 'TextDecoder',
    },
  },
  plugins: [
    resolve({
      customResolveOptions: {
        moduleDirectory: "node_modules",
      },
    }),
    babel({
      exclude: "node_modules/**",
      babelHelpers: "runtime",
      plugins: ["@babel/plugin-transform-runtime"],
    }),
    commonjs(),
    json(),
  ],
};

// ESM config
const esmConfig = Object.assign({}, commonConfig);
esmConfig.output = Object.assign({}, commonConfig.output, {
  file: "dist/mjs/monk.mjs",
  format: "esm",
});

// ESM prod config
const esmProdConfig = Object.assign({}, esmConfig);
esmProdConfig.output = Object.assign({}, esmConfig.output, {
  file: "dist/mjs/monk.min.mjs",
  sourcemap: false,
});
esmProdConfig.plugins = [...esmConfig.plugins, terser()];

// CJS config
const cjsConfig = Object.assign({}, commonConfig);
cjsConfig.output = Object.assign({}, commonConfig.output, {
  file: "dist/cjs/monk.cjs",
  format: "cjs",
});
cjsConfig.plugins = [...commonConfig.plugins];

// CJS Production config
const cjsProdConfig = Object.assign({}, cjsConfig);
cjsProdConfig.output = Object.assign({}, cjsConfig.output, {
  file: "dist/cjs/monk.min.cjs",
  sourcemap: false,
});
cjsProdConfig.plugins = [...cjsConfig.plugins, terser()];

let configurations = [esmConfig, esmProdConfig, cjsConfig, cjsProdConfig];
export default configurations;
