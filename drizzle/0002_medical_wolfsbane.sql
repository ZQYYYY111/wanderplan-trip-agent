PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`share_token` text NOT NULL,
	`owner_token_hash` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`destination` text NOT NULL,
	`data_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_trips`("id", "share_token", "owner_token_hash", "title", "destination", "data_json", "version", "created_at", "updated_at") SELECT "id", "share_token", "owner_token_hash", "title", "destination", "data_json", "version", "created_at", "updated_at" FROM `trips`;--> statement-breakpoint
DROP TABLE `trips`;--> statement-breakpoint
ALTER TABLE `__new_trips` RENAME TO `trips`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `trips_share_token_unique` ON `trips` (`share_token`);