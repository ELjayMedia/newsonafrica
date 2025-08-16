module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json']
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
}
