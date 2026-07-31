import process from 'node:process';
import { EnvConfig } from '#shared/utils/env';
import { toCachedFn } from '#shared/utils/fn';

export const getEnvConfig = toCachedFn(() => EnvConfig.parse(process.env));
