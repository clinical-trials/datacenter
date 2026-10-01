CREATE TABLE `source_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`checked_at` text NOT NULL,
	`result` text NOT NULL,
	`records_found` integer NOT NULL,
	`notes` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `checks_source_time` ON `source_checks` (`source_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `filings` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe_key` text NOT NULL,
	`project` text NOT NULL,
	`state` text NOT NULL,
	`filed_date` text NOT NULL,
	`review_status` text DEFAULT 'unreviewed' NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`first_seen` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `filings_dedupe_unique` ON `filings` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `filings_state_date` ON `filings` (`state`,`filed_date`);--> statement-breakpoint
CREATE TABLE `filing_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`filing_id` text NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`reason` text NOT NULL,
	`reviewer` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`filing_id`) REFERENCES `filings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `filing_history` ON `filing_revisions` (`filing_id`,`created_at`);