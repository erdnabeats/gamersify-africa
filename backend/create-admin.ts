import 'dotenv/config';
import argon2 from 'argon2';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { prisma } from './lib/prisma-db';

const rl = readline.createInterface({
  input,
  output,
});

async function ask(
  question: string,
  hidden = false
): Promise<string> {
  if (!hidden) {
    return (await rl.question(question)).trim();
  }

  process.stdout.write(question);

  return new Promise(resolve => {
    const stdin = process.stdin;

    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';

    const onData = (char: string) => {
      if (char === '\n' || char === '\r') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
        return;
      }

      if (char === '\u0003') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        process.exit(1);
      }

      if (char === '\u007f') {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    };

    stdin.on('data', onData);
  });
}

async function main() {
  console.log('');
  console.log('======================================');
  console.log('       GAMERSIFY ADMIN SETUP');
  console.log('======================================');
  console.log('');

  const email = (
    await ask('Admin email: ')
  ).toLowerCase();

  const name =
    await ask('Admin name: ');

  const password =
    await ask('Password: ', true);

  const confirmPassword =
    await ask('Confirm password: ', true);

  if (!email || !password) {
    throw new Error(
      'Email and password are required.'
    );
  }

  if (password !== confirmPassword) {
    throw new Error(
      'Passwords do not match.'
    );
  }

  if (password.length < 12) {
    throw new Error(
      'Password must be at least 12 characters.'
    );
  }

  const passwordHash =
    await argon2.hash(password);

  const existing =
    await prisma.adminUser.findUnique({
      where: { email },
    });

  const admin = existing
    ? await prisma.adminUser.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          name: name || existing.name,
          role: 'Super Admin',
          active: true,
          deletedAt: null,
        },
      })
    : await prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          name: name || null,
          role: 'Super Admin',
          active: true,
        },
      });

  console.log('');
  console.log(
    `✓ Super Admin configured: ${admin.email}`
  );
  console.log('');

  await rl.close();
  await prisma.$disconnect();
}

main().catch(async error => {
  console.error('');
  console.error('Admin setup failed:');
  console.error(error.message);
  console.error('');

  await rl.close();
  await prisma.$disconnect();
  process.exit(1);
});