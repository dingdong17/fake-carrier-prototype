CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event` text NOT NULL,
	`check_id` text,
	`document_id` text,
	`duration_ms` integer,
	`meta` text,
	`created_at` text NOT NULL
);
