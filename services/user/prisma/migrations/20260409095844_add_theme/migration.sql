/*
  Warnings:

  - You are about to drop the column `dark_theme` on the `profile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[active_theme_id]` on the table `profile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "profile" DROP COLUMN "dark_theme",
ADD COLUMN     "active_theme_id" UUID;

-- CreateTable
CREATE TABLE "themes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color_bg" VARCHAR(20) NOT NULL,
    "color_main" VARCHAR(20) NOT NULL,
    "color_caret" VARCHAR(20) NOT NULL,
    "color_text" VARCHAR(20) NOT NULL,
    "color_sub" VARCHAR(20) NOT NULL,
    "color_sub_alt" VARCHAR(20) NOT NULL,
    "color_error" VARCHAR(20) NOT NULL,
    "color_extra_error" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_active_theme_id_key" ON "profile"("active_theme_id");

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_active_theme_id_fkey" FOREIGN KEY ("active_theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
