import { authRelations } from './auth';

export * from './auth';
export * from './global-config';
export * from './meetings';

export const relations = {
  ...authRelations,
};
