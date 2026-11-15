CREATE TABLE `routine_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_days_routine_idx` ON `routine_days` (`routine_id`);--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`order` integer NOT NULL,
	`target_sets` integer DEFAULT 3 NOT NULL,
	FOREIGN KEY (`day_id`) REFERENCES `routine_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_exercises_day_idx` ON `routine_exercises` (`day_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`preset_key` text,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workouts` ADD `name` text;--> statement-breakpoint
ALTER TABLE `workouts` ADD `routine_day_id` integer REFERENCES routine_days(id) ON DELETE SET NULL;