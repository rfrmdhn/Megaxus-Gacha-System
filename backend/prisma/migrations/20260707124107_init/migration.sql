-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "coins" INTEGER NOT NULL DEFAULT 500,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gacha_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_items" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "drop_rate" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gacha_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "coins_spent" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gacha_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "gacha_items_event_id_idx" ON "gacha_items"("event_id");

-- CreateIndex
CREATE INDEX "gacha_logs_user_id_created_at_idx" ON "gacha_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "gacha_logs_created_at_idx" ON "gacha_logs"("created_at");

-- AddForeignKey
ALTER TABLE "gacha_items" ADD CONSTRAINT "gacha_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "gacha_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_logs" ADD CONSTRAINT "gacha_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_logs" ADD CONSTRAINT "gacha_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "gacha_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_logs" ADD CONSTRAINT "gacha_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "gacha_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
