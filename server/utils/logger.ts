import { consola, LogLevels } from 'consola';

export function createLogger(tag: string) {
  const logger = consola.withTag(tag);
  logger.level = import.meta.dev ? LogLevels.debug : LogLevels.info;
  return logger;
}
