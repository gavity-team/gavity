ALTER TABLE "accounts" RENAME COLUMN "provider_account_id" TO "account_id";--> statement-breakpoint
ALTER INDEX "accounts_issuer_providerAccountId_uidx" RENAME TO "accounts_issuer_accountId_uidx";