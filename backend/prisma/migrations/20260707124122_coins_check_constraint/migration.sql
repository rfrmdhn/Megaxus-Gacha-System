-- DB-level integrity backstop, independent of application logic correctness.
ALTER TABLE "users" ADD CONSTRAINT "users_coins_nonnegative" CHECK ("coins" >= 0);
