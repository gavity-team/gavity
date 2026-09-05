import { text, timestamp } from 'drizzle-orm/pg-core';
import { generateCode } from '../../id';

export interface CommonFieldsOptions {
  /** @default 16 */
  idLength?: number
}

export function buildCommonFields(options: CommonFieldsOptions = {}) {
  return {
    id: text('id')
      .primaryKey()
      .$default(() => generateCode(options.idLength ?? 16)),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  } as const;
}
