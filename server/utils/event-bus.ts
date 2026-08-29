import type { GlobalConfig } from '#shared/utils/global-config';
import { EventEmitter } from 'node:events';
import { sendMail } from './email';
import { refreshCache } from './global-config';
import { createLogger } from './logger';

const logger = createLogger('event-bus');

export type EventMessage = {
  timestamp: number
} & ({
  type: 'globalConfig.updated'
  data: {
    key: keyof GlobalConfig
  }
} | {
  type: 'emailSending.enqueued'
  data: {
    to: string
    subject: string
    text: string
  }
});

export const redisEventBus = new EventEmitter<{
  [P in EventMessage['type']]: [EventMessage & { type: P }]
}>();

export async function startRedisEventListener(): Promise<void> {
  registerEventListeners();

  const { startRedisListener } = await import('./redis');
  await startRedisListener();

  logger.debug('Redis event listener started');
}

function registerEventListeners(): void {
  redisEventBus.on('globalConfig.updated', async () => {
    await refreshCache();
  });

  redisEventBus.on('emailSending.enqueued', async (message) => {
    logger.debug(`Handling email sending for ${message.data.to}: ${message.data.subject}`);
    await sendMail(message.data.to, message.data.subject, message.data.text);
    logger.debug(`Email sent successfully to ${message.data.to}`);
  });
}
