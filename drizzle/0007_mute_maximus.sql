CREATE TABLE `admin_audit_events` (
	`id` varchar(36) NOT NULL,
	`actorUserId` varchar(36) NOT NULL,
	`action` varchar(80) NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` varchar(80),
	`outcome` enum('success','failure','cancelled') NOT NULL,
	`requestId` varchar(64),
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_audit_events_created_idx` ON `admin_audit_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_audit_events_target_idx` ON `admin_audit_events` (`targetType`,`targetId`);