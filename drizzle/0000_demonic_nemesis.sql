CREATE TABLE `backlog_items` (
	`id` text PRIMARY KEY NOT NULL,
	`item_number` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text NOT NULL,
	`status` text DEFAULT 'backlog' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `backlog_items_item_number_unique` ON `backlog_items` (`item_number`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `checks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checks` (
	`id` text PRIMARY KEY NOT NULL,
	`check_number` text NOT NULL,
	`carrier_name` text NOT NULL,
	`carrier_country` text,
	`carrier_vat_id` text,
	`carrier_contact` text,
	`risk_score` real,
	`confidence_level` real,
	`recommendation` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`test_set` text DEFAULT 'medium' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checks_check_number_unique` ON `checks` (`check_number`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`document_type` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`extracted_fields` text,
	`risk_signals` text,
	`document_score` real,
	`confidence` real,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `checks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text,
	`category` text NOT NULL,
	`comment` text NOT NULL,
	`page` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `checks`(`id`) ON UPDATE no action ON DELETE no action
);
