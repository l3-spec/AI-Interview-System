-- AlterTable: fix user_posts columns that should be TEXT but were created as VARCHAR(191)
ALTER TABLE `user_posts` MODIFY COLUMN `images` TEXT NULL;
ALTER TABLE `user_posts` MODIFY COLUMN `tags` TEXT NULL;
