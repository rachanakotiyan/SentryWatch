import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'react-hooks': reactHooks,
      react: reactPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-vars': 'error',
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
