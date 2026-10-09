ALTER TABLE `gallery_posts` ADD `video_key` text;--> statement-breakpoint
ALTER TABLE `gallery_posts` ADD `video_token` text;--> statement-breakpoint
ALTER TABLE `gallery_posts` ADD `video_size` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_posts_video_token_unique` ON `gallery_posts` (`video_token`);