import argon2 from 'argon2';
import { db } from './backend/lib/prisma-db';
import { TABLES } from './backend/schema';

async function main() {
  const email = 'gamersifyaf@gmail.com';
  const password = 'Gamersify@2026!';

  const users = await db.list(TABLES.adminUsers, { limit: 100 });

  const user = users.items.find(
    (u: any) => String(u.email).toLowerCase() === email
  );

  if (!user) {
    throw new Error(`Admin user not found: ${email}`);
  }

  const passwordHash = await argon2.hash(password);

  await db.update(TABLES.adminUsers, [
    {
      id: user.id,
      record: {
        ...user,
        passwordHash,
        active: true,
        updatedAt: new Date().toISOString(),
      },
    },
  ]);

  console.log(`Password reset successfully for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
