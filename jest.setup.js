// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test'

// Clerk
process.env.CLERK_SECRET_KEY = 'sk_test_clerk_secret_key_123456789'
process.env.CLERK_WEBHOOK_SECRET = 'whsec_test_clerk_webhook_secret'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_clerk_publishable_key'

// Stripe
process.env.STRIPE_SECRET_KEY = 'sk_test_mock123456789'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_stripe_publishable_key'

// Resend
process.env.RESEND_API_KEY = 're_test_resend_api_key'

// Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_supabase_anon_key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_supabase_service_role_key'

// Suppress console errors in tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve(new Map())),
  cookies: jest.fn(() => Promise.resolve(new Map())),
}))
