import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  // En runtime, priorizar el Connection Pooler de Supabase (puerto 6543 / pgbouncer)
  let connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DIRECT_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error('No se encontró la variable DATABASE_URL o de conexión a PostgreSQL.');
  }

  // Bypass TLS check para Supabase transaction pooler
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}sslmode=no-verify`;
  }

  // En serverless (Vercel), cada invocación procesa 1 solicitud a la vez.
  // Limitar max a 2 conexiones por contenedor previene saturar el connection pooler de Supabase.
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      max: process.env.NODE_ENV === 'production' ? 2 : 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 5000,
      ssl: {
        rejectUnauthorized: false,
      },
    });

  // Guardar SIEMPRE en globalThis para garantizar singleton absoluto en contenedores warm
  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Guardar en globalThis para evitar duplicación tanto en desarrollo (HMR) como en producción (serverless warm containers)
globalForPrisma.prisma = prisma;

