CREATE INDEX `grade_evidence_user_date_idx` ON `grade_evidence` (`user_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `grade_evidence_status_date_idx` ON `grade_evidence` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `grade_evidence_hash_idx` ON `grade_evidence` (`evidence_hash`);