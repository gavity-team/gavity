import { authRelations } from './auth';
import { orgsRelations } from './orgs';

export * from './auth';
export * from './global-config';
export * from './meetings';
export * from './orgs';

export const relations = {
  ...authRelations,
  ...orgsRelations,
};
