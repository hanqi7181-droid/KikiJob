import js from '@eslint/js';
import globals from 'globals';

const commonRules = {
  'no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'yxt-image-prototype/**', 'debug-reports/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}', 'server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...commonRules,
      'no-control-regex': 'off',
    },
  },
  {
    files: ['src/**/*.jsx'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['chrome-extension/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        module: 'readonly',
        chrome: 'readonly',
        JobPilotAutofill: 'writable',
      },
    },
    rules: commonRules,
  },
  {
    files: ['**/*.test.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: commonRules,
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: commonRules,
  },
];
