import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const globalConfig = pgTable('global_config', {
  id: text('id').primaryKey().default('singleton'),
  defaultLanguage: text('default_language'),
  allowRegistration: boolean('allow_registration'),
  allowedUserEmailRegex: text('allowed_user_email_regex'),
  smtpUrl: text('smtp_url'),
  defaultEmailSender: text('default_email_sender'),
  verificationEmailSender: text('verification_email_sender'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
