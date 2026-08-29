import type { InjectionKey } from 'vue';
import type { CustomGlobalConfig } from '#shared/utils/global-config';

export const GlobalConfigFormStateKey: InjectionKey<CustomGlobalConfig> = Symbol('global-config-form-state');
