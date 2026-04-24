CREATE TABLE `webinar_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`consent_at` text NOT NULL,
	`status` text DEFAULT 'pending_confirm' NOT NULL,
	`confirm_token` text NOT NULL,
	`confirm_token_expires` integer NOT NULL,
	`confirmed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`slot_id`) REFERENCES `webinar_slots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webinar_registrations_confirm_token_unique` ON `webinar_registrations` (`confirm_token`);--> statement-breakpoint
CREATE TABLE `webinar_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`timezone` text DEFAULT 'Europe/Berlin' NOT NULL,
	`max_attendees` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
