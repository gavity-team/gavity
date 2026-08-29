import { createTransport } from 'nodemailer';
import { getGlobalConfig } from './global-config';
import { createLogger } from './logger';
import { publishEvent } from './redis';

const logger = createLogger('email');

let currentSmtpUrl = '';
let transporter: ReturnType<typeof createTransport> | null = null;

async function createTransporter() {
  const config = await getGlobalConfig();
  const newSmtpUrl = config.smtpUrl;

  if (!newSmtpUrl) {
    if (transporter) {
      transporter.close();
      transporter = null;
    }
    return null;
  }

  if (currentSmtpUrl !== newSmtpUrl || !transporter) {
    if (transporter)
      transporter.close();
    transporter = createTransport(newSmtpUrl);
    currentSmtpUrl = newSmtpUrl;
    logger.info(`Recreated transporter due to config change`);
  }

  return transporter;
};

export async function queueEmailSending(to: string, subject: string, text: string): Promise<void> {
  await publishEvent('emailSending.enqueued', { to, subject, text });
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const transport = await createTransporter();
  if (!transport)
    return logger.warn(`SMTP 未配置，邮件未发送\n  收件人：${to}\n  主题：${subject}\n  内容：${text}`);

  try {
    await transport.sendMail({ to, subject, text });
    logger.info(`Sent successfully: ${to} - ${subject}`);
  } catch (error: unknown) {
    logger.error('Failed to send:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
