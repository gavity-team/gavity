import { consola } from 'consola';
import { createTransport } from 'nodemailer';
import { getEnvConfig } from '#server/utils/env';
import { toCachedFn } from '#shared/utils/fn';

const getTransport = toCachedFn(() => {
  const env = getEnvConfig();
  if (!env.SMTP_URL)
    return;
  return createTransport(env.SMTP_URL, { from: env.SMTP_FROM });
});

const logger = consola.withTag('mail');

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const transport = getTransport();
  if (!transport)
    return logger.warn(`SMTP 未配置，邮件未发送\n  收件人：${to}\n  主题：${subject}\n  内容：${text}`);
  await transport.sendMail({ to, subject, text });
}
