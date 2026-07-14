CREATE TABLE IF NOT EXISTS `premium_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`plan` text DEFAULT 'premium_access' NOT NULL,
	`amount_krw` integer NOT NULL,
	`payment_method` text NOT NULL,
	`payer_name` text NOT NULL,
	`payment_reference` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `premium_requests_user_date_idx` ON `premium_requests` (`user_email`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `premium_requests_status_idx` ON `premium_requests` (`status`,`created_at`);
