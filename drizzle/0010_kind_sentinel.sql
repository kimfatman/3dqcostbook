DROP INDEX `backup_runs_status_created_idx` ON `backup_runs`;--> statement-breakpoint
ALTER TABLE `backup_runs` ADD `attempt` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `backup_runs` ADD `nextAttemptAt` timestamp;--> statement-breakpoint
ALTER TABLE `backup_runs` ADD `leaseUntil` timestamp;--> statement-breakpoint
ALTER TABLE `backup_runs` ADD `workerId` varchar(80);--> statement-breakpoint
ALTER TABLE `backup_runs` ADD `idempotencyKey` varchar(160);--> statement-breakpoint
ALTER TABLE `backup_runs` ADD `sourceSnapshot` json;--> statement-breakpoint
ALTER TABLE `backup_runs` ADD CONSTRAINT `backup_runs_idempotency_unique` UNIQUE(`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `backup_runs_status_attempt_idx` ON `backup_runs` (`status`,`nextAttemptAt`);