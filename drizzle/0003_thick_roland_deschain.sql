CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`hash` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `songs_owner_hash` ON `songs` (`owner`,`hash`);--> statement-breakpoint
CREATE INDEX `songs_owner_created` ON `songs` (`owner`,`created_at`);
--> statement-breakpoint
INSERT INTO songs (id,owner,hash,name,type,size,object_key,created_at)
SELECT a.id,a.owner,'asset:' || a.id,a.name,a.type,a.size,a.object_key,p.updated_at
FROM assets a JOIN projects p ON p.id=a.project_id WHERE a.kind='audio';
