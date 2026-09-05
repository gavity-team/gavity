import pluginQuery from '@tanstack/eslint-plugin-query';
import ts from '@typed-sigterm/eslint-config';

export default ts({
  ignores: ['server/utils/db/schema/auth.ts', 'migrations/**'],
  rules: {
    'ts/no-redeclare': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
  },
}, ...pluginQuery.configs['flat/recommended-strict']);
