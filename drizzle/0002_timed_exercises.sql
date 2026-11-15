ALTER TABLE `exercises` ADD `measure` text DEFAULT 'reps' NOT NULL;--> statement-breakpoint
UPDATE `exercises` SET `measure` = 'time', `rep_range_min` = 30, `rep_range_max` = 60 WHERE `name` = 'Plank';
