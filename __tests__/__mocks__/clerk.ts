// Mock Clerk auth
export const mockAuth = {
  userId: 'user_test123',
  orgId: 'org_test123',
  sessionId: 'sess_test123',
  getToken: jest.fn().mockResolvedValue('mock_token'),
}

// Mock the auth function
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => Promise.resolve(mockAuth)),
  currentUser: jest.fn(() => Promise.resolve({
    id: 'user_test123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
  })),
}))

// Helper to set mock auth values
export function setMockAuth(overrides: Partial<typeof mockAuth>) {
  Object.assign(mockAuth, overrides)
}

// Helper to reset mock auth to defaults
export function resetMockAuth() {
  mockAuth.userId = 'user_test123'
  mockAuth.orgId = 'org_test123'
  mockAuth.sessionId = 'sess_test123'
}

// Mock for unauthenticated state
export function setUnauthenticated() {
  mockAuth.userId = null
  mockAuth.orgId = null
  mockAuth.sessionId = null
}
