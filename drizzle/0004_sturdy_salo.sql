CREATE TABLE `grade_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`subject_id` text NOT NULL,
	`level` text NOT NULL,
	`component_id` text NOT NULL,
	`component_name` text NOT NULL,
	`source_platform` text NOT NULL,
	`score_earned` integer NOT NULL,
	`score_possible` integer NOT NULL,
	`percent` integer NOT NULL,
	`assessment_weight` integer NOT NULL,
	`assessment_date` text NOT NULL,
	`evidence_key` text NOT NULL,
	`evidence_hash` text NOT NULL,
	`evidence_mime` text NOT NULL,
	`evidence_size` integer NOT NULL,
	`original_filename` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`automated_checks` text DEFAULT '[]' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grade_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`subject_id` text NOT NULL,
	`level` text NOT NULL,
	`target_percent` integer DEFAULT 75 NOT NULL,
	`grade7_boundary` integer DEFAULT 75 NOT NULL,
	`upcoming_component_id` text DEFAULT 'p1' NOT NULL,
	`upcoming_component_name` text DEFAULT 'Paper 1' NOT NULL,
	`upcoming_weight` integer DEFAULT 20 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grade_goals_user_subject_level_idx` ON `grade_goals` (`user_email`,`subject_id`,`level`);