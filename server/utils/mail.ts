import process from 'node:process';
import nodemailer from 'nodemailer';

/**
 * SMTP 邮件发送：通过环境变量配置
 * （SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / SMTP_FROM）。
 * 未配置 SMTP_HOST 时降级为打印到服务端日志（本地开发用）。
 */

const smtpHost = process.env.SMTP_HOST;

const transport = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number.parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!transport) {
    console.warn(`[mail] SMTP 未配置，邮件未发送\n  收件人：${to}\n  主题：${subject}\n  内容：${text}`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}
