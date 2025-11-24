# Landing Page Feature - Low Priority Improvements

This document lists low-priority improvements and technical debt items for the Landing Page feature that can be addressed post-deployment.

## Code Quality Improvements

### 1. TypeScript Strictness
**Current State**: Some `any` types in use for backward compatibility
**Impact**: Low - Types are validated at runtime
**Effort**: Medium

**Files Affected**:
- `/app/api/settings/landing-config/route.ts` - Social links casting
- Various JSON field types

**Recommendation**:
Create proper TypeScript interfaces for all JSON fields:
```typescript
interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  website?: string | null;
}

// Use proper typing throughout instead of `as any`
```

### 2. ESLint Violations
**Current State**: Minor unused imports and variables
**Impact**: Very Low - No runtime impact
**Effort**: Low

**Fix**: Run `npm run lint --fix` and manually review remaining issues

---

## Performance Optimizations

### 3. Database Query Optimization
**Current State**: Multiple separate queries in landing page route
**Impact**: Low - Noticeable only under high traffic
**Effort**: Medium

**Files Affected**:
- `/app/(public)/[churchSlug]/page.tsx` (lines 87-116)

**Current Approach**:
```typescript
const landingConfig = await prisma.landingPageConfig.findUnique({ ... });
const stripeAccount = await prisma.stripeConnectAccount.findUnique({ ... });
const activeFlows = await prisma.flow.findMany({ ... });
```

**Recommended Approach**:
```typescript
const [landingConfig, church] = await Promise.all([
  prisma.landingPageConfig.findUnique({
    where: { churchId: church.id },
    include: {
      Church: {
        include: {
          StripeConnectAccount: true,
          Flow: {
            where: { isEnabled: true },
            take: 1
          }
        }
      }
    }
  }),
]);
```

**Benefits**:
- Reduces database round trips from 3-4 to 1
- Faster page loads (estimated 50-100ms improvement)
- Lower database load

### 4. Image Content Validation
**Current State**: Only MIME type validation
**Impact**: Low - Users could upload non-image files with image MIME types
**Effort**: Medium

**Recommendation**:
Use `sharp` library to validate actual image content:
```typescript
import sharp from 'sharp';

async function validateImageContent(buffer: Buffer): Promise<boolean> {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch (error) {
    return false;
  }
}
```

**Benefits**:
- Prevents storage waste from invalid files
- Better user experience (catch errors earlier)

---

## UX Enhancements

### 5. Missing Loading States
**Current State**: No skeleton loaders for landing page preview
**Impact**: Low - Brief flash of empty state
**Effort**: Medium

**Files Affected**:
- `/components/settings/landing-page-preview.tsx`

**Recommendation**:
Add skeleton loading component:
```typescript
{isLoading ? (
  <div className="animate-pulse space-y-4">
    <div className="h-32 w-32 rounded-full bg-gray-200 mx-auto" />
    <div className="h-8 w-48 bg-gray-200 rounded mx-auto" />
    <div className="h-4 w-64 bg-gray-200 rounded mx-auto" />
  </div>
) : (
  <PreviewContent />
)}
```

### 6. Progress Indicators for Image Upload
**Current State**: No visual feedback during upload
**Impact**: Low - Users may think app is frozen on slow connections
**Effort**: Low

**Recommendation**:
Add upload progress bar using native Progress API or library like `react-uploady`

### 7. Enhanced Preview Modal
**Current State**: Small inline preview only
**Impact**: Very Low - Users can still see preview
**Effort**: Medium

**Recommendation**:
Add fullscreen preview modal for better visualization before saving

---

## Accessibility Improvements

### 8. Missing ARIA Labels
**Current State**: Some interactive elements lack ARIA labels
**Impact**: Low - Screen readers may not provide full context
**Effort**: Low

**Files Affected**:
- `/components/settings/color-picker.tsx`
- `/components/settings/button-manager.tsx` (drag handles)

**Recommended Additions**:
```typescript
<div
  {...listeners}
  aria-label="Drag handle to reorder button"
  role="button"
  tabIndex={0}
>
  <GripVertical />
</div>
```

### 9. Keyboard Navigation for Color Picker
**Current State**: Color picker requires mouse
**Impact**: Low - Alternative text input available
**Effort**: Medium

**Recommendation**:
Add keyboard shortcuts for common colors or arrow key navigation

---

## Documentation & Testing

### 10. Missing Internationalization Keys
**Current State**: Some error messages hardcoded in English
**Impact**: Very Low - Affects edge cases only
**Effort**: Low

**Files with Hardcoded Strings**:
- Toast error messages in `/components/settings/landing-share-modal.tsx`
- Canvas error messages

**Fix**: Add these to translation files

### 11. Unit Tests
**Current State**: No unit tests for validation utilities
**Impact**: Low - Manual testing covers main use cases
**Effort**: Medium

**Recommended Tests**:
```typescript
// Test URL validation
describe('validateAndSanitizeUrl', () => {
  it('should accept valid HTTP URLs', () => {
    expect(validateAndSanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should reject javascript: URLs', () => {
    expect(validateAndSanitizeUrl('javascript:alert(1)')).toBeNull();
  });
});

// Test button validation
describe('validateButtons', () => {
  it('should validate button structure', () => {
    const result = validateButtons([
      { id: 'test', type: 'custom', label: 'Test', url: 'https://example.com', enabled: true, order: 0 }
    ]);
    expect(result.isValid).toBe(true);
  });
});
```

### 12. E2E Tests
**Current State**: No end-to-end tests
**Impact**: Low - Feature tested manually
**Effort**: High

**Recommended Test Scenarios**:
- Upload logo and crop
- Configure buttons and preview
- Share landing page
- Visit public landing page

**Tools**: Playwright or Cypress

---

## Infrastructure

### 13. Content Security Policy Enhancement
**Current State**: Basic CSP in place
**Impact**: Very Low - Current security is adequate
**Effort**: Low

**Recommended Addition**:
```typescript
headers: [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; img-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
]
```

### 14. Redis for Rate Limiting
**Current State**: In-memory rate limiting (works for single instance)
**Impact**: Low - Only matters at scale
**Effort**: Medium

**When to Implement**:
- When deploying multiple server instances
- When memory usage becomes a concern (>1000 active rate limit entries)

**Migration Path**:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function rateLimit(identifier: string) {
  const key = `ratelimit:${identifier}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowMs / 1000);
  }

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

---

## Monitoring & Analytics

### 15. Telemetry for Landing Page Views
**Current State**: No tracking of landing page usage
**Impact**: Low - Nice to have for product insights
**Effort**: Low

**Recommendation**:
Add simple view counter:
```typescript
// In landing page route
await prisma.landingPageView.create({
  data: {
    churchId: church.id,
    timestamp: new Date(),
    userAgent: request.headers.get('user-agent'),
  }
});
```

### 16. Performance Monitoring
**Current State**: No specific metrics for landing page
**Impact**: Very Low - General monitoring exists
**Effort**: Low

**Recommendation**:
Add custom Sentry transactions:
```typescript
const transaction = Sentry.startTransaction({
  name: 'Landing Page Load',
  op: 'http.server',
});

// ... render logic ...

transaction.finish();
```

---

## Priority Summary

| Priority | Item Count | Total Effort | When to Address |
|----------|------------|--------------|-----------------|
| **Code Quality** | 2 | Low-Medium | Next refactoring sprint |
| **Performance** | 2 | Medium | When traffic increases 10x |
| **UX** | 3 | Low-Medium | Next UX improvement sprint |
| **Accessibility** | 2 | Low-Medium | Next accessibility audit |
| **Documentation** | 2 | Medium-High | Over next 2-3 months |
| **Infrastructure** | 2 | Low-Medium | When scaling beyond single instance |
| **Monitoring** | 2 | Low | When analytics becomes priority |

---

## Estimated Total Effort

- **Low Priority Items**: ~40 hours
- **Nice-to-Have Items**: ~20 hours
- **Future Considerations**: ~30 hours

**Recommendation**: Address items incrementally over 3-6 months as part of regular maintenance sprints.

---

## Last Updated
January 22, 2025

## Document Owner
Development Team

## Review Schedule
Quarterly review recommended to re-prioritize based on user feedback and production metrics
