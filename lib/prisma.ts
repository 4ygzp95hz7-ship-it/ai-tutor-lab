import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma() {
  const libsql = createClient({ url: 'file:./dev.db' })
  const adapter = new PrismaLibSql(libsql)
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['error'] : [] })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
