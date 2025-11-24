# AltarFlow Test Suite

This directory contains all automated tests for the AltarFlow platform.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run critical tests only (auth + validation + webhooks)
npm run test:critical
```

## Directory Structure

```
__tests__/
├── __mocks__/               # Shared mocks for external services
│   ├── clerk.ts            # Authentication mocking (Clerk)
│   ├── prisma.ts           # Database mocking (Prisma)
│   ├── resend.ts           # Email service mocking (Resend)
│   └── stripe.ts           # Payment processor mocking (Stripe)
│
├── api/                     # API route tests
│   └── webhooks/
│       └── stripe.test.ts  # Stripe webhook handler tests
│
├── lib/                     # Library/utility tests
│   ├── auth/
│   │   └── authorize-church-access.test.ts  # Authorization tests
│   └── validation/
│       └── stripe.test.ts                   # Input validation tests
│
└── components/              # Component tests (future)
```

## Test Categories

### 🔴 Critical (Priority 1)
- **Authorization** (`lib/auth/`) - 17 tests
- **Validation** (`lib/validation/`) - 47 tests
- **Webhooks** (`api/webhooks/`) - 15 tests

**Total: 71 tests passing** ✅

### 🟠 High Priority (Next Phase)
- Payment intent creation
- Rate limiting
- Subscription management

### 🟡 Medium Priority (Future)
- Financial reporting
- Email campaigns
- Expense management

## Writing Tests

### Basic Pattern

```typescript
import { prismaMock } from '../../__mocks__/prisma'
import { functionToTest } from '@/lib/module'

describe('Module Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should do something specific', async () => {
    // Arrange: Set up test data
    prismaMock.model.findUnique.mockResolvedValue({ id: '123' })

    // Act: Execute code
    const result = await functionToTest('123')

    // Assert: Verify results
    expect(result).toBeDefined()
    expect(prismaMock.model.findUnique).toHaveBeenCalledWith({
      where: { id: '123' }
    })
  })
})
```

### Using Mocks

#### Database (Prisma)

```typescript
import { prismaMock } from '../../__mocks__/prisma'

prismaMock.donationTransaction.findUnique.mockResolvedValue({
  id: 'txn_123',
  amount: 10000,
  status: 'pending',
})
```

#### Authentication (Clerk)

```typescript
import { setMockAuth, setUnauthenticated } from '../../__mocks__/clerk'

// Authenticated user
setMockAuth({ userId: 'user_123', orgId: 'org_123' })

// Unauthenticated
setUnauthenticated()
```

#### Payments (Stripe)

```typescript
import { mockStripe, createMockPaymentIntent } from '../../__mocks__/stripe'

mockStripe.paymentIntents.create.mockResolvedValue(
  createMockPaymentIntent({ id: 'pi_123', amount: 10000 })
)
```

## Test Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode (re-run on changes) |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:ci` | CI/CD optimized (no watch, parallel) |
| `npm run test:auth` | Run authorization tests only |
| `npm run test:validation` | Run validation tests only |
| `npm run test:webhooks` | Run webhook tests only |
| `npm run test:critical` | Run all critical tests |

## Coverage

View coverage report:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Thresholds

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Best Practices

### 1. Test Independence

Each test should be independent:

```typescript
beforeEach(() => {
  jest.clearAllMocks()
  resetMockAuth()
})
```

### 2. Descriptive Names

```typescript
// ❌ Bad
it('works', () => { ... })

// ✅ Good
it('should deny access when user is not authenticated', () => { ... })
```

### 3. AAA Pattern

```typescript
it('should update status', async () => {
  // Arrange
  const data = { id: '123', status: 'pending' }
  prismaMock.model.findUnique.mockResolvedValue(data)

  // Act
  const result = await updateStatus('123', 'completed')

  // Assert
  expect(result.status).toBe('completed')
})
```

### 4. Test Edge Cases

```typescript
describe('amount validation', () => {
  it('should accept valid amounts', () => { ... })
  it('should reject zero', () => { ... })
  it('should reject negative', () => { ... })
  it('should handle maximum boundary', () => { ... })
})
```

### 5. Mock External Services

```typescript
// ❌ Never make real API calls
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ✅ Always use mocks
mockStripe.paymentIntents.create.mockResolvedValue(...)
```

## Troubleshooting

### Tests hanging

- Ensure all promises are awaited
- Check for missing mock implementations
- Increase timeout if needed: `jest.setTimeout(10000)`

### Mock not working

- Import mock before the module under test
- Use `jest.clearAllMocks()` in `beforeEach()`
- Check mock is properly exported

### TypeScript errors

- Ensure `@types/jest` is installed
- Add `__tests__` to tsconfig include
- Use `as any` for complex mock types when necessary

## Documentation

- [TESTING_GUIDE.md](/docs/TESTING_GUIDE.md) - Comprehensive testing guide
- [TEST_SETUP_COMPLETE.md](/docs/TEST_SETUP_COMPLETE.md) - Setup summary

## Contributing

When adding new features:

1. Write tests first (TDD recommended)
2. Ensure tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Update documentation if needed

## Current Status

✅ **71 tests passing**
- 17 authorization tests
- 47 validation tests  
- 15 webhook tests

🎯 **Coverage Goals**
- Critical security: 80%+
- Financial logic: 70%+
- Business logic: 60%+

---

**Last Updated**: November 24, 2025  
**Maintained By**: AltarFlow Engineering Team
