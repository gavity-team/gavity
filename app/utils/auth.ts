import { adminClient, emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/vue';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    adminClient(),
    emailOTPClient(),
  ],
});
