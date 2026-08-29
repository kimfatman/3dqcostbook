CREATE TABLE `admin_migration_reviews` (
	`id` varchar(36) NOT NULL,
	`migrationId` varchar(32) NOT NULL,
	`title` varchar(160) NOT NULL,
	`impactSummary` varchar(500) NOT NULL,
	`rollbackPlan` varchar(500) NOT NULL,
	`destructive` boolean NOT NULL DEFAULT false,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` varchar(36),
	`reviewNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_migration_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_migration_reviews_migration_unique` UNIQUE(`migrationId`)
);
--> statement-breakpoint
CREATE TABLE `global_configs` (
	`id` varchar(36) NOT NULL,
	`configKey` varchar(80) NOT NULL,
	`version` int NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`payload` json NOT NULL,
	`changeSummary` varchar(240) NOT NULL,
	`createdByUserId` varchar(36) NOT NULL,
	`publishedByUserId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	CONSTRAINT `global_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `global_configs_key_version_unique` UNIQUE(`configKey`,`version`)
);
--> statement-breakpoint
CREATE INDEX `admin_migration_reviews_status_idx` ON `admin_migration_reviews` (`status`);--> statement-breakpoint
CREATE INDEX `global_configs_key_status_idx` ON `global_configs` (`configKey`,`status`);