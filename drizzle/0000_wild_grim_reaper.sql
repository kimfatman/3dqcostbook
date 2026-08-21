CREATE TABLE `app_users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(120) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedInAt` timestamp,
	CONSTRAINT `app_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` varchar(36) NOT NULL,
	`workspaceId` varchar(36) NOT NULL,
	`actorUserId` varchar(36) NOT NULL,
	`action` varchar(80) NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` varchar(80),
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_open_id_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `workspace_books` (
	`workspaceId` varchar(36) NOT NULL,
	`schemaVersion` int NOT NULL DEFAULT 3,
	`revision` int NOT NULL DEFAULT 0,
	`state` json NOT NULL,
	`updatedByUserId` varchar(36) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_books_workspaceId` PRIMARY KEY(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`workspaceId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_members_pk` PRIMARY KEY(`workspaceId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`ownerId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_events_workspace_created_idx` ON `audit_events` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workspace_members_user_idx` ON `workspace_members` (`userId`);--> statement-breakpoint
CREATE INDEX `workspaces_owner_idx` ON `workspaces` (`ownerId`);