// Mock Resend client
export const mockResend = {
  emails: {
    send: jest.fn().mockResolvedValue({ 
      id: 'email_test123',
      data: null,
      error: null
    }),
  },
}

jest.mock('resend', () => ({
  Resend: jest.fn(() => mockResend),
}))

// Helper to make email sending fail
export function makeEmailFail(error: string) {
  mockResend.emails.send.mockResolvedValueOnce({
    id: null,
    data: null,
    error: { message: error },
  })
}

// Helper to reset email mock
export function resetEmailMock() {
  mockResend.emails.send.mockClear()
  mockResend.emails.send.mockResolvedValue({ 
    id: 'email_test123',
    data: null,
    error: null
  })
}
