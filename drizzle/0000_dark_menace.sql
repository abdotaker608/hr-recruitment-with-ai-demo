CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`resume_text` text,
	`created_at` integer DEFAULT (unixepoch('now')*1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`department` text,
	`location` text,
	`jd_text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now')*1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `qa_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`screening_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now')*1000) NOT NULL,
	FOREIGN KEY (`screening_id`) REFERENCES `screenings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `screenings` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`mode` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch('now')*1000) NOT NULL,
	`ended_at` integer,
	`fit_score` real,
	`salary_expectation` text,
	`notice_period` text,
	`reason_for_leaving` text,
	`motivation` text,
	`career_expectations` text,
	`summary` text,
	`risk_flags` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sparc_items` (
	`id` text PRIMARY KEY NOT NULL,
	`screening_id` text NOT NULL,
	`anchor_snippet` text NOT NULL,
	`situation` text,
	`problem` text,
	`action` text,
	`result` text,
	`calibration` text,
	`score` real,
	FOREIGN KEY (`screening_id`) REFERENCES `screenings`(`id`) ON UPDATE no action ON DELETE no action
);
