/*
  Move active_theme_id from profile to users table.
  Theme is now linked only to User, not to Profile.
*/

-- DropForeignKey
ALTER TABLE "profile" DROP CONSTRAINT "profile_active_theme_id_fkey";

-- DropIndex
DROP INDEX "profile_active_theme_id_key";

-- AlterTable: remove active_theme_id from profile
ALTER TABLE "profile" DROP COLUMN "active_theme_id";

-- AlterTable: add active_theme_id to users
ALTER TABLE "users" ADD COLUMN "active_theme_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_active_theme_id_key" ON "users"("active_theme_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_theme_id_fkey" FOREIGN KEY ("active_theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
