CREATE TABLE `backup_runs` (
	`id` varchar(36) NOT NULL,
	`scheduleId` varchar(36) NOT NULL,
	`status` enum('queued','running','succeeded','failed','cancelled') NOT NULL DEFAULT 'queued',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`bytesWritten` int,
	`errorSummary` varchar(240),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backup_schedules` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`cadence` enum('daily','weekly') NOT NULL,
	`runAt` varchar(5) NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
	`retentionDays` int NOT NULL DEFAULT 30,
	`status` enum('enabled','paused') NOT NULL DEFAULT 'enabled',
	`createdByUserId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backup_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_metric_samples` (
	`id` varchar(36) NOT NULL,
	`metricKey` varchar(80) NOT NULL,
	`value` int NOT NULL,
	`unit` varchar(16) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_metric_samples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `backup_runs_schedule_created_idx` ON `backup_runs` (`scheduleId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `backup_runs_status_created_idx` ON `backup_runs` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `backup_schedules_status_run_idx` ON `backup_schedules` (`status`,`runAt`);--> statement-breakpoint
CREATE INDEX `system_metric_samples_key_time_idx` ON `system_metric_samples` (`metricKey`,`recordedAt`);