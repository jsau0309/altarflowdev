# AltarFlow Testing Guide

## Overview

This guide provides comprehensive instructions for writing, running, and maintaining tests in the AltarFlow codebase. As of November 2024, we've established a robust testing framework to ensure code quality and prevent regressions in our production system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Mocking Strategy](#mocking-strategy)
6. [Coverage Goals](#coverage-goals)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

All test dependencies are already installed. If you need to reinstall:

```bash
npm install --save-dev jest ts-jest @types/jest @testing-library/react @testing-library/jest-dom jest-mock-extended
```

### Test Framework Stack

- **Jest**: Test runner and assertion library
- **ts-jest**: TypeScript support for Jest
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM
- **jest-mock-extended**: Advanced mocking utilities

### Configuration Files

- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Global test setup and environment variables
- `__tests__/__mocks__/` - Shared mock implementations

## Test Structure

```
__tests__/
├── __mocks__/           # Shared mocks
│   ├── prisma.ts        # Database mock
│   ├── stripe.ts        # Stripe API mock
│   ├── clerk.ts         # Auth mock
│   └── resend.ts        # Email mock
├── api/                 # API route tests
│   ├── webhooks/
│   │   └── stripe.test.ts
│   └── donations/
│       └── initiate.test.ts
├── lib/                 # Library/utility tests
│   ├── auth/
│   │   └── authorize-church-access.test.ts
│   └── validation/
│       └── stripe.test.ts
└── components/          # Component tests (future)
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (optimized for CI/CD)
npm run test:ci
```

### Targeted Test Commands

```bash
# Run only authorization tests
npm run test:auth

# Run only validation tests
npm run test:validation

# Run only webhook tests
npm run test:webhooks

# Run all critical tests (auth, validation, webhooks)
npm run test:critical
```

### Filter Tests

```bash
# Run specific test file
npm test -- __tests__/lib/auth/authorize-church-access.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should deny access"

# Run only failed tests from last run
npm test -- --onlyFailures
```

## Writing Tests

### Test File Naming

- Test files: `*.test.ts` or `*.test.tsx`
- Place tests in `__tests__/` directory mirroring source structure
- Example: `lib/auth/authorize.ts` → `__tests__/lib/auth/authorize.test.ts`

### Basic Test Structure

```typescript
import { functionToTest } from '@/lib/module'
import { prismaMock } from '../../__mocks__/prisma'

describe('Module Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Feature group', () => {
    it('should do something specific', async () => {
      // Arrange: Set up test data
      const input = { ... }
      prismaMock.model.findUnique.mockResolvedValue({ ... })

      // Act: Execute the code
      const result = await functionToTest(input)

      // Assert: Verify results
      expect(result).toBe(expected)
      expect(prismaMock.model.findUnique).toHaveBeenCalledWith(...)
    })
  })
})
```

### Critical Test Categories

#### 1. Security Tests (HIGHEST PRIORITY)

Test authorization, authentication, and data isolation:

```typescript
describe('Security tests', () => {
  it('should prevent horizontal privilege escalation', async () => {
    // Attempt to access another organization's data
    setMockAuth({ orgId: 'attacker_org' })
    prismaMock.church.findFirst.mockResolvedValue(null)

    const result = await authorizeChurchAccess('victim_church_id')

    expect(result.success).toBe(false)
  })

  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --"
    
    // Should not throw, Prisma handles safely
    await expect(functionToTest(maliciousInput)).resolves.not.toThrow()
  })
})
```

#### 2. Payment Tests (HIGH PRIORITY)

Test financial calculations and Stripe integration:

```typescript
describe('Payment processing', () => {
  it('should calculate fees correctly', () => {
    const baseAmount = 10000 // $100.00
    const feeAmount = calculateStripeFee(baseAmount, 'card')
    
    // 2.9% + $0.30 = $3.20
    expect(feeAmount).toBe(320)
  })

  it('should handle payment intent creation idempotently', async () => {
    const idempotencyKey = 'unique_key'
    
    // First call creates
    await createPaymentIntent({ idempotencyKey, ... })
    
    // Second call with same key returns existing
    await createPaymentIntent({ idempotencyKey, ... })
    
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1)
  })
})
```

#### 3. Validation Tests

Test input validation and error handling:

```typescript
describe('Input validation', () => {
  it('should reject invalid email format', () => {
    expect(() => donorEmailSchema.parse('not-email')).toThrow()
  })

  it('should enforce amount limits', () => {
    const maxAmount = 99999999 // $999,999.99
    expect(() => donationAmountSchema.parse(maxAmount + 1)).toThrow()
  })
})
```

#### 4. Webhook Tests

Test webhook signature verification and processing:

```typescript
describe('Webhook handling', () => {
  it('should verify valid signature', async () => {
    mockHeaders.set('stripe-signature', 'valid_sig')
    mockStripe.webhooks.constructEvent.mockReturnValue(event)

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should reject invalid signature', async () => {
    mockHeaders.set('stripe-signature', 'invalid_sig')
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
```

## Mocking Strategy

### Database Mocking (Prisma)

```typescript
import { prismaMock } from '../../__mocks__/prisma'

// Mock a query result
prismaMock.donationTransaction.findUnique.mockResolvedValue({
  id: 'txn_123',
  amount: 10000,
  status: 'pending',
})

// Mock a transaction
prismaMock.$transaction.mockImplementation(async (callback) => {
  return callback({
    donationTransaction: {
      findUnique: jest.fn().mockResolvedValue({ ... }),
      update: jest.fn().mockResolvedValue({ ... }),
    },
  } as any)
})
```

### Stripe Mocking

```typescript
import { mockStripe, createMockStripeEvent, createMockPaymentIntent } from '../../__mocks__/stripe'

// Mock Stripe API call
mockStripe.paymentIntents.create.mockResolvedValue(
  createMockPaymentIntent({ id: 'pi_test123' })
)

// Create mock webhook event
const event = createMockStripeEvent('payment_intent.succeeded', {
  id: 'pi_test123',
  status: 'succeeded',
})
```

### Authentication Mocking (Clerk)

```typescript
import { setMockAuth, setUnauthenticated } from '../../__mocks__/clerk'

// Set authenticated user
setMockAuth({ 
  userId: 'user_123', 
  orgId: 'org_123' 
})

// Set unauthenticated state
setUnauthenticated()
```

### Email Mocking (Resend)

```typescript
import { mockResend, makeEmailFail } from '../../__mocks__/resend'

// Email sending succeeds by default
// To test failure:
makeEmailFail('Rate limit exceeded')
```

## Coverage Goals

### Current Coverage Status

- **Critical Security Code**: Target 80%+
  - Authorization: `lib/auth/`
  - Input validation: `lib/validation/`
  
- **Financial Logic**: Target 70%+
  - Payment processing: `app/api/donations/`
  - Webhook handlers: `app/api/webhooks/`
  - Fee calculations: `lib/stripe/`

- **Business Logic**: Target 60%+
  - Server actions: `lib/actions/`
  - Reports: `lib/reports/`
  - Email campaigns: `lib/email/`

### Viewing Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in:
- `coverage/lcov-report/index.html` (detailed HTML report)
- `coverage/coverage-summary.json` (JSON summary)

Open the HTML report in your browser:
```bash
open coverage/lcov-report/index.html
```

### Coverage Requirements

The `jest.config.js` enforces minimum thresholds:

```javascript
coverageThresholds: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

**Note**: Initial coverage will be low. Thresholds can be adjusted as coverage improves.

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hook

Add to `.husky/pre-commit` (if using Husky):

```bash
#!/bin/sh
npm run test:critical
```

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on others:

```typescript
// ❌ BAD: Tests depend on execution order
let userId: string

it('should create user', () => {
  userId = createUser() // Sets shared state
})

it('should find user', () => {
  const user = findUser(userId) // Depends on previous test
})

// ✅ GOOD: Each test is independent
it('should create user', () => {
  const userId = createUser()
  expect(userId).toBeDefined()
})

it('should find user', () => {
  const userId = createUser() // Create fresh data
  const user = findUser(userId)
  expect(user).toBeDefined()
})
```

### 2. Clear Test Names

Use descriptive names that explain what is being tested:

```typescript
// ❌ BAD
it('works', () => { ... })
it('test1', () => { ... })

// ✅ GOOD
it('should deny access when user is not authenticated', () => { ... })
it('should calculate card fees as 2.9% + $0.30', () => { ... })
```

### 3. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('should update transaction status on payment success', async () => {
  // Arrange: Set up test data and mocks
  const transaction = { id: 'txn_123', status: 'pending' }
  prismaMock.donationTransaction.findUnique.mockResolvedValue(transaction)
  prismaMock.donationTransaction.update.mockResolvedValue({ ...transaction, status: 'succeeded' })

  // Act: Execute the code under test
  const result = await processPaymentSuccess('pi_123')

  // Assert: Verify the results
  expect(result.status).toBe('succeeded')
  expect(prismaMock.donationTransaction.update).toHaveBeenCalledWith({
    where: { stripePaymentIntentId: 'pi_123' },
    data: { status: 'succeeded' }
  })
})
```

### 4. Test Edge Cases

Don't just test the happy path:

```typescript
describe('donation amount validation', () => {
  it('should accept valid amounts', () => {
    expect(validateAmount(10000)).toBe(true)
  })

  it('should reject zero', () => {
    expect(() => validateAmount(0)).toThrow()
  })

  it('should reject negative', () => {
    expect(() => validateAmount(-100)).toThrow()
  })

  it('should reject amounts exceeding maximum', () => {
    expect(() => validateAmount(100000000)).toThrow()
  })

  it('should handle boundary values', () => {
    expect(validateAmount(1)).toBe(true) // Minimum
    expect(validateAmount(99999999)).toBe(true) // Maximum
  })
})
```

### 5. Mock External Services

Never make real API calls in tests:

```typescript
// ❌ BAD: Real Stripe API call
it('should create payment intent', async () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const pi = await stripe.paymentIntents.create({ ... })
})

// ✅ GOOD: Mocked Stripe call
it('should create payment intent', async () => {
  mockStripe.paymentIntents.create.mockResolvedValue(
    createMockPaymentIntent()
  )
  const pi = await createPaymentIntent({ ... })
})
```

### 6. Reset Mocks Between Tests

Always clean up between tests:

```typescript
describe('Test suite', () => {
  beforeEach(() => {
    jest.clearAllMocks() // Clear call history
    resetMockAuth() // Reset to default state
  })

  afterEach(() => {
    jest.restoreAllMocks() // Restore original implementations
  })
})
```

### 7. Test Async Code Properly

Handle promises correctly:

```typescript
// ✅ GOOD: Using async/await
it('should update record', async () => {
  const result = await asyncFunction()
  expect(result).toBe(expected)
})

// ✅ GOOD: Using resolves/rejects
it('should throw error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message')
})

// ❌ BAD: Forgetting to wait
it('should update record', () => {
  asyncFunction() // This won't wait!
  expect(result).toBe(expected) // Will fail
})
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module '@/lib/...'"

**Problem**: Module path alias not resolving.

**Solution**: Check `jest.config.js` has correct `moduleNameMapper`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

#### 2. "ReferenceError: TextEncoder is not defined"

**Problem**: Missing Node.js globals in test environment.

**Solution**: Add to `jest.setup.js`:

```javascript
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder
```

#### 3. Tests hanging or timing out

**Problem**: Async operations not completing.

**Solution**: 
- Ensure all promises are awaited
- Increase timeout: `jest.setTimeout(10000)`
- Check for missing mock implementations

#### 4. Mock not working

**Problem**: Real implementation being called instead of mock.

**Solution**:
- Ensure mock is imported before the module under test
- Use `jest.mock()` at the top of the file
- Clear mocks between tests

#### 5. TypeScript errors in tests

**Problem**: Type mismatches in test files.

**Solution**:
- Update `tsconfig.json` to include test files
- Use `as any` for complex mock types when needed
- Ensure `@types/jest` is installed

### Debugging Tests

```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test file with verbose output
npm test -- --verbose __tests__/lib/auth/authorize-church-access.test.ts

# Show test names without running
npm test -- --listTests
```

### Getting Help

1. Check Jest documentation: https://jestjs.io/docs/getting-started
2. Check Testing Library docs: https://testing-library.com/docs/
3. Search existing tests for examples
4. Ask team members on Slack

## Next Steps

### Immediate Priorities

1. ✅ **Critical Tests Complete**: Authorization, Validation, Webhooks
2. 🔄 **High Priority**: Payment initiation, Rate limiting, Subscription logic
3. ⏳ **Medium Priority**: Email campaigns, Expense management, Reports

### Expansion Plan

As the test suite grows:

1. **Add integration tests** for full API flows
2. **Add E2E tests** using Playwright or Cypress
3. **Add visual regression tests** for UI components
4. **Set up test database** for integration tests
5. **Configure code coverage tracking** (Codecov/Coveralls)

### Contributing New Tests

When adding features, always include tests:

1. Write tests first (TDD approach recommended)
2. Ensure new code maintains coverage thresholds
3. Add tests to PR checklist
4. Update this guide if adding new patterns

---

## Quick Reference

### Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:critical` | Run security/payment tests only |
| `npm run test:auth` | Run authorization tests |
| `npm run test:validation` | Run validation tests |
| `npm run test:webhooks` | Run webhook tests |

### File Locations

| Path | Purpose |
|------|---------|
| `__tests__/` | All test files |
| `__tests__/__mocks__/` | Shared mocks |
| `jest.config.js` | Jest configuration |
| `jest.setup.js` | Test environment setup |
| `coverage/` | Coverage reports (gitignored) |

### Coverage Targets

| Category | Target | Priority |
|----------|--------|----------|
| Security (auth, validation) | 80%+ | Critical |
| Financial (payments, webhooks) | 70%+ | High |
| Business logic | 60%+ | Medium |
| UI components | 50%+ | Low |

---

**Last Updated**: November 2024  
**Maintained By**: AltarFlow Engineering Team
