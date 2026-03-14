import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('johndoe123', 10);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
    },
  });

  const testPassword = await bcrypt.hash('testpass123', 10);
  await prisma.user.upsert({
    where: { email: 'test@hurrian.xyz' },
    update: { password: testPassword },
    create: {
      email: 'test@hurrian.xyz',
      name: 'Test User',
      password: testPassword,
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
