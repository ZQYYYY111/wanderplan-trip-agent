CREATE TABLE `trip_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_id` text NOT NULL,
	`version` integer NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `trips` ADD `owner_token_hash` text DEFAULT '' NOT NULL;
