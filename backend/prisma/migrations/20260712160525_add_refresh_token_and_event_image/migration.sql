-- AlterTable
ALTER TABLE "gacha_events" ADD COLUMN     "image_key" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "refresh_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "refresh_token_hash" TEXT;
