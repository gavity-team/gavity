import type { EventMessage } from './event-bus';
import { hostname } from 'node:os';
import process from 'node:process';
import { createClient } from 'redis';
import { getEnvConfig } from './env';
import { redisEventBus } from './event-bus';
import { createLogger } from './logger';

export const REDIS_STREAM = 'gavity:events';

const logger = createLogger('redis');

let redisClient: ReturnType<typeof createClient> | undefined;
export async function getRedis() {
  if (!redisClient) {
    const env = getEnvConfig();
    redisClient = createClient({
      url: env.REDIS_URL,
      socket: { connectTimeout: 5000 },
    });
    redisClient.on('error', e => logger.error('Redis error: %o', e));
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('ready', () => logger.info('Redis ready'));
    await redisClient.connect();
  }
  return redisClient;
}

export async function publishEvent<T extends EventMessage['type']>(
  type: T,
  data: (EventMessage & { type: T })['data'],
): Promise<void> {
  const client = await getRedis();
  await client.xAdd(REDIS_STREAM, '*', {
    type,
    timestamp: String(Date.now()),
    data: JSON.stringify(data),
  });
}

export async function startRedisListener(): Promise<void> {
  const client = await getRedis();
  const consumerGroup = 'gavity-consumers';
  const consumerName = `${hostname()}:${process.pid}`;

  logger.info(`Starting Redis stream listener for group: ${consumerGroup}`);
  try {
    await client.xGroupCreate(REDIS_STREAM, consumerGroup, '0');
    logger.info(`Created consumer group: ${consumerGroup} on stream: ${REDIS_STREAM}`);
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes('BUSYGROUP'))
      throw e;
  }

  const consumeLoop = async () => {
    while (true) {
      try {
        const messages = await client.xReadGroup(
          consumerGroup,
          consumerName,
          [{ key: REDIS_STREAM, id: '>' }],
        );

        for (const streamItem of messages || []) {
          const streamMessages = streamItem.messages as Array<{
            id: string
            message: Record<string, string>
          }>;

          for (const { message } of streamMessages) {
            const type = message.type!;
            redisEventBus.emit(type, {
              type,
              data: JSON.parse(message.data!),
              timestamp: Number(message.timestamp),
            });
          }
          await client.xAck(REDIS_STREAM, consumerGroup, streamMessages.map(x => x.id));
        }
      } catch (error) {
        logger.error(`Error reading from stream: ${error instanceof Error ? error.message : String(error)}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  consumeLoop().catch(e => logger.error(`Fatal error in consume loop: %o`, e));
}
