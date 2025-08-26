import { PrismaClient } from '@prisma/client'
import { loadEnvFromFile } from '../env-loader'

// Load environment variables from .env file first
loadEnvFromFile()

// Extend globalThis for better TypeScript support
declare const globalThis: {
  prismaGlobal: PrismaClient | undefined
} & typeof global

// Single source of truth for database connection
const prisma = globalThis.prismaGlobal ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// In development, store in globalThis to survive hot reloads
if (process.env.NODE_ENV === 'development') {
  globalThis.prismaGlobal = prisma
}

let prismaConnectedPromise: Promise<void> | null = null

export const connectToDatabase = async (
  DATABASE_URL = process.env.DATABASE_URL
) => {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Please configure your environment variables.')
  }
  if (!prismaConnectedPromise) {
    prismaConnectedPromise = prisma.$connect().catch((err) => {
      prismaConnectedPromise = null
      throw err
    })
  }
  await prismaConnectedPromise
  return { prisma, isMock: false }
}

export const clearDatabaseCache = () => {
  console.log('🔄 Database cache cleared (Prisma handles connection pooling)')
}

export const forceRefreshDatabaseConnection = async () => {
  console.log('🔄 Force refreshing database connection...')
  try {
    await prisma.$disconnect()
    return connectToDatabase()
  } catch (error) {
    console.error('Failed to refresh database connection:', error)
    return { isMock: true, prisma: null }
  }
}

export const isUsingMockData = () => false

export const closeGlobalPrisma = async () => {
  console.log('🔌 Closing Prisma client...')
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error closing Prisma client:', error)
  }
}

// Export initialization functions
export { initializeDatabase } from './init'
