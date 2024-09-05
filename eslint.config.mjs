import { fixupPluginRules } from '@eslint/compat'
import ava from 'eslint-plugin-ava'
import stylisticJs from '@stylistic/eslint-plugin-js'

export default [
  {
    plugins: {
      ava: fixupPluginRules(ava),
      '@stylistic/js': stylisticJs
    },

    rules: {
      'ava/prefer-async-await': 0,
      '@stylistic/js/indent': ['error', 2, { 'SwitchCase': 1 }],
      '@stylistic/js/semi': ['error', 'never'],
    }
  }
]
