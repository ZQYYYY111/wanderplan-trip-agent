CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`share_token` text NOT NULL,
	`title` text NOT NULL,
	`destination` text NOT NULL,
	`data_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trips_share_token_unique` ON `trips` (`share_token`);