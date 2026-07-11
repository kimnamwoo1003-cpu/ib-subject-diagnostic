CREATE TABLE `profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`premium` integer DEFAULT false NOT NULL,
	`selected_subjects` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`subject_id` text NOT NULL,
	`subject_name` text NOT NULL,
	`level` text NOT NULL,
	`paper_id` text NOT NULL,
	`paper_name` text NOT NULL,
	`mode` text NOT NULL,
	`percent` integer NOT NULL,
	`grade` integer NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`topic_breakdown` text DEFAULT '[]' NOT NULL,
	`mistakes` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
