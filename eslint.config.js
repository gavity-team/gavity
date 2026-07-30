import ts from '@typed-sigterm/eslint-config';

export default ts({
  ignores: ['server/utils/db/schema/auth.ts'],
  rules: {
    'ts/no-redeclare': 'off',
  },
});
