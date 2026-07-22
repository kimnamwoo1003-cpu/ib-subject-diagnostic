CREATE TABLE `community_bookmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_bookmarks_unique_idx` ON `community_bookmarks` (`user_email`,`post_id`);--> statement-breakpoint
CREATE TABLE `community_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`author_email` text NOT NULL,
	`parent_id` integer,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`moderation_state` text DEFAULT 'clean' NOT NULL,
	`moderation_signals` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_comments_post_date_idx` ON `community_comments` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_comments_author_date_idx` ON `community_comments` (`author_email`,`created_at`);--> statement-breakpoint
CREATE TABLE `community_follows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`follower_email` text NOT NULL,
	`following_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_follows_unique_idx` ON `community_follows` (`follower_email`,`following_email`);--> statement-breakpoint
CREATE TABLE `community_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`type` text NOT NULL,
	`actor_email` text,
	`post_id` integer,
	`comment_id` integer,
	`message` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_notifications_user_date_idx` ON `community_notifications` (`user_email`,`created_at`);--> statement-breakpoint
CREATE TABLE `community_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_email` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`moderation_state` text DEFAULT 'clean' NOT NULL,
	`moderation_signals` text DEFAULT '[]' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_posts_status_date_idx` ON `community_posts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_posts_author_date_idx` ON `community_posts` (`author_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_posts_category_date_idx` ON `community_posts` (`category`,`created_at`);--> statement-breakpoint
CREATE TABLE `community_profiles` (
	`user_email` text PRIMARY KEY NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`school` text DEFAULT '' NOT NULL,
	`graduation_year` integer,
	`avatar_color` text DEFAULT 'indigo' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `community_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`reaction_type` text DEFAULT 'like' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_reactions_unique_idx` ON `community_reactions` (`user_email`,`target_type`,`target_id`,`reaction_type`);--> statement-breakpoint
CREATE INDEX `community_reactions_target_idx` ON `community_reactions` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `community_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporter_email` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`reason` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_reports_unique_idx` ON `community_reports` (`reporter_email`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `community_reports_status_date_idx` ON `community_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `moderation_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`target_author` text NOT NULL,
	`reason` text NOT NULL,
	`severity` text NOT NULL,
	`signals` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reported_by` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`admin_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `moderation_cases_status_date_idx` ON `moderation_cases` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `moderation_cases_author_date_idx` ON `moderation_cases` (`target_author`,`created_at`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `account_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `suspended_until` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `suspension_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `moderation_strikes` integer DEFAULT 0 NOT NULL;