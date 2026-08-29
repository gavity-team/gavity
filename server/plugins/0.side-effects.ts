import { consola, LogLevels } from 'consola';

export default async () => {
  consola.level = LogLevels.verbose;
  consola.wrapStd();
};
