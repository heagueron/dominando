import { PrismaClient } from '@prisma/client';

// PrismaClient es adjuntado al objeto global en desarrollo para prevenir
// múltiples instancias del cliente Prisma en desarrollo
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
