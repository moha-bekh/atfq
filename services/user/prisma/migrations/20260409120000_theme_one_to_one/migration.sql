/*
  Enforce 1:1 between User and Theme.
  Remove active_theme_id from users (no longer needed).
  Add unique constraint on themes.user_id.
*/

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_active_theme_id_fkey";

-- DropIndex
DROP INDEX "users_active_theme_id_key";

-- AlterTable: remove active_theme_id from users
ALTER TABLE "users" DROP COLUMN "active_theme_id";

-- CreateIndex: enforce one theme per user
CREATE UNIQUE INDEX "themes_user_id_key" ON "themes"("user_id");
