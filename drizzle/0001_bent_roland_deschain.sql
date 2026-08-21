CREATE TABLE `media_assets` (
	`id` varchar(36) NOT NULL,
	`workspaceId` varchar(36) NOT NULL,
	`ownerUserId` varchar(36) NOT NULL,
	`kind` enum('user_avatar','workspace_logo','cost_card_image') NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`mimeType` varchar(80) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `app_users` ADD `avatarAssetId` varchar(36);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `industryId` varchar(40) DEFAULT 'restaurant' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `contactName` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `logoAssetId` varchar(36);--> statement-breakpoint
CREATE INDEX `media_assets_workspace_idx` ON `media_assets` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `media_assets_owner_idx` ON `media_assets` (`ownerUserId`);