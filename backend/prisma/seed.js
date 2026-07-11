require('dotenv/config');
const bcrypt = require('bcrypt');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Role } = require('../generated/prisma');

const BCRYPT_ROUNDS = 10;
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'password123!';

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
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
