ALTER TABLE `test_attempts` ADD `criteria_breakdown` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `test_attempts` ADD `question_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `test_attempts` ADD `difficulty_trail` text DEFAULT '[]' NOT NULL;