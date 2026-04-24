CREATE TABLE `demo_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`email` text NOT NULL,
	`email_domain` text NOT NULL,
	`phone` text,
	`fleet_size` text NOT NULL,
	`tms` text NOT NULL,
	`note` text,
	`consent_at` text NOT NULL,
	`status` text DEFAULT 'pending_confirm' NOT NULL,
	`confirm_token` text NOT NULL,
	`confirm_token_expires` integer NOT NULL,
	`confirmed_at` text,
	`reviewed_by_user_id` text,
	`reviewed_at` text,
	`rejection_reason` text,
	`provisioned_client_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provisioned_client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_requests_confirm_token_unique` ON `demo_requests` (`confirm_token`);