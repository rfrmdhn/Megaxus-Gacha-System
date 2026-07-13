require('dotenv/config');
const bcrypt = require('bcrypt');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Role } = require('../generated/prisma');

const BCRYPT_ROUNDS = 10;
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'password123!';

const SYSTEM_CONFIG_DEFAULTS = [
  { key: 'PULL_COST', value: 10 },
  { key: 'MAX_BULK_PULL', value: 10 },
  { key: 'GACHA_PULL_THROTTLE_LIMIT', value: 120 },
  { key: 'GACHA_PULL_THROTTLE_TTL_MS', value: 60000 },
  { key: 'ADMIN_FEED_RATE_LIMIT_MAX', value: 10 },
  { key: 'ADMIN_FEED_RATE_LIMIT_DURATION_MS', value: 1000 },
  { key: 'GLOBAL_THROTTLE_LIMIT', value: 40 },
  { key: 'GLOBAL_THROTTLE_TTL_MS', value: 60000 },
  { key: 'BCRYPT_ROUNDS', value: 10 },
  { key: 'REFRESH_TOKEN_BYTES', value: 32 },
  { key: 'DEFAULT_REFRESH_EXPIRES_SECONDS', value: 604800 },
  { key: 'JWT_ACCESS_EXPIRES_IN_SECONDS', value: 900 },
  { key: 'RECENT_HISTORY_LIMIT', value: 10 },
  { key: 'BACKSTOP_TTL_SECONDS', value: 86400 },
  { key: 'PULL_COST_FRONTEND', value: 10 },
  { key: 'MULTI_PULL_COUNT', value: 10 },
  { key: 'PULL_REVEAL_ANIMATION_MS', value: 700 },
  { key: 'REFRESH_DEBOUNCE_MS', value: 500 },
];

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  // Upsert with a no-op `update` so re-running the seed (every container boot)
  // never overwrites credentials an admin may have since changed via the API.
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS),
      role: Role.admin,
    },
  });

  console.log(`Seeded admin user: ${ADMIN_EMAIL}`);

  // Seed system config — upsert so existing values are never overwritten.
  for (const entry of SYSTEM_CONFIG_DEFAULTS) {
    await prisma.systemConfig.upsert({
      where: { key: entry.key },
      update: {},
      create: { key: entry.key, value: entry.value },
    });
  }

  console.log(`Seeded ${SYSTEM_CONFIG_DEFAULTS.length} system config entries`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
