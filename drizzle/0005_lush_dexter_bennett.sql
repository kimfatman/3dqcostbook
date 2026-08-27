ALTER TABLE `app_users` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `app_users` ADD `phoneNumber` varchar(24);--> statement-breakpoint
ALTER TABLE `app_users` ADD `cloudbaseSubject` varchar(128);--> statement-breakpoint
ALTER TABLE `app_users` ADD CONSTRAINT `app_users_phone_unique` UNIQUE(`phoneNumber`);--> statement-breakpoint
ALTER TABLE `app_users` ADD CONSTRAINT `app_users_cloudbase_subject_unique` UNIQUE(`cloudbaseSubject`);