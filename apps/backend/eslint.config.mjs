// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'off', // Allow require() for Node.js
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }], // Allow namespace for type augmentation
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      'object-shorthand': 'warn',
      'prefer-arrow-callback': 'warn',
      
      // Node.js specific
      'no-process-exit': 'off',
      'no-sync': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      'prisma/**',
      '**/*.test.ts',
      '**/__tests__/**',
      '**/__mocks__/**',
      'coverage/**',
      '.env*',
      '*.config.js',
      '*.config.mjs',
    ],
  },
);

