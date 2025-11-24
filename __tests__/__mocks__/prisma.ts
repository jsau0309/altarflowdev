import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// Mock the prisma module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: prismaMock,
}))

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock)
})

export type MockPrismaClient = DeepMockProxy<PrismaClient>
