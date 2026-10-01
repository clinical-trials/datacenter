import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const filings = sqliteTable('filings', {
 id: text('id').primaryKey(), dedupeKey: text('dedupe_key').notNull(), project: text('project').notNull(), state: text('state').notNull(), filedDate: text('filed_date').notNull(), reviewStatus: text('review_status').notNull().default('unreviewed'), payload: text('payload').notNull(), version: integer('version').notNull().default(1), firstSeen: text('first_seen').notNull(), updatedAt: text('updated_at').notNull()
}, t => [uniqueIndex('filings_dedupe_unique').on(t.dedupeKey), index('filings_state_date').on(t.state,t.filedDate)]);
export const revisions = sqliteTable('filing_revisions', {
 id:text('id').primaryKey(),filingId:text('filing_id').notNull().references(()=>filings.id),version:integer('version').notNull(),payload:text('payload').notNull(),reason:text('reason').notNull(),reviewer:text('reviewer').notNull(),createdAt:text('created_at').notNull()
}, t=>[index('filing_history').on(t.filingId,t.createdAt)]);
export const checks = sqliteTable('source_checks', {
 id:text('id').primaryKey(),sourceId:text('source_id').notNull(),checkedAt:text('checked_at').notNull(),result:text('result').notNull(),recordsFound:integer('records_found').notNull(),notes:text('notes').notNull()
}, t=>[index('checks_source_time').on(t.sourceId,t.checkedAt)]);
