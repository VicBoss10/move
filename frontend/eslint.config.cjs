module.exports = [
  {
    ignores: ['projects/**/*', 'node_modules/**', 'dist/**'],
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
    },
    rules: {},
  },
  {
    files: ['**/*.html'],
    rules: {},
  },
];
