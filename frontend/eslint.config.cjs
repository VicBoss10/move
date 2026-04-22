module.exports = [
  {
    ignores: ['projects/**/*', 'node_modules/**', 'dist/**', '.angular/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
       'unused-imports': require('eslint-plugin-unused-imports'),
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
       'unused-imports/no-unused-imports': 'error',
       'unused-imports/no-unused-vars': ['warn', { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }]
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: require('@angular-eslint/template-parser'),
    },
    plugins: {
      '@angular-eslint/template': require('@angular-eslint/eslint-plugin-template'),
    },
    rules: {
      '@angular-eslint/template/no-negated-async': 'warn',
    },
  },
];
