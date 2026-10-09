CREATE TABLE `gallery_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner` text NOT NULL,
	`author` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`settings` text NOT NULL,
	`assets` text NOT NULL,
	`cover_key` text NOT NULL,
	`analysis_key` text NOT NULL,
	`duration` integer NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_posts_project_id_unique` ON `gallery_posts` (`project_id`);--> statement-breakpoint
CREATE INDEX `gallery_public_created` ON `gallery_posts` (`published`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `gallery_owner_created` ON `gallery_posts` (`owner`,`created_at`,`id`);