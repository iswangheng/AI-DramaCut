CREATE TABLE `highlights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer,
	`duration_ms` integer,
	`reason` text NOT NULL,
	`viral_score` real NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`is_confirmed` integer DEFAULT false NOT NULL,
	`custom_start_ms` integer,
	`custom_end_ms` integer,
	`exported_path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`current_step` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `queue_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`queue_name` text NOT NULL,
	`job_type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`progress` integer DEFAULT 0,
	`checkpoint` text,
	`retry_count` integer DEFAULT 0,
	`result` text,
	`error` text,
	`processed_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `queue_jobs_job_id_unique` ON `queue_jobs` (`job_id`);--> statement-breakpoint
CREATE TABLE `recap_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`text` text NOT NULL,
	`order` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`audio_offset_ms` integer NOT NULL,
	`word_timestamps` text NOT NULL,
	`video_cues` text,
	`matched_shot_id` integer,
	`is_manually_set` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `recap_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recap_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`storyline_id` integer NOT NULL,
	`style` text NOT NULL,
	`title` text NOT NULL,
	`estimated_duration_ms` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`output_path` text,
	`audio_path` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`storyline_id`) REFERENCES `storylines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`description` text NOT NULL,
	`emotion` text NOT NULL,
	`dialogue` text,
	`characters` text,
	`viral_score` real,
	`start_frame` integer NOT NULL,
	`end_frame` integer NOT NULL,
	`thumbnail_path` text,
	`semantic_tags` text,
	`embeddings` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `storylines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`attraction_score` real NOT NULL,
	`shot_ids` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`filename` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`fps` integer NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`summary` text,
	`viral_score` real,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
