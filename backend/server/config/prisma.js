import process from 'node:process';

let client;
/** Lazily create the Prisma client so mock mode never needs `prisma generate` or a database. */
export async function getPrisma() {
  if (client) return client;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when USE_MOCK_DB is not "true"');
  }
  const { PrismaClient } = await import('@prisma/client');
  client = new PrismaClient();
  return client;
}
