# ESLint Cleanup Plan

## Overview
Build is failing due to 400+ ESLint errors. Most are code quality issues, not bugs, but some could indicate real problems.

## Critical Fixes (Do Now - ~30 minutes)

### 1. React Hook Violation (MUST FIX)
**File**: `app/(dashboard)/communication/new/editor/email-editor-wrapper.tsx:349`
**Error**: React Hook "useTopolConfig" is called conditionally
**Fix**: Move hook call outside conditional or restructure component
**Impact**: Can cause runtime crashes

### 2. Unused Variables in API Routes
**Files**: Multiple API routes
**Pattern**: `request` parameter unused in GET routes
**Fix**: Replace with `_request` or remove if using Next.js 15
**Example**:
```typescript
// Before
export async function GET(request: NextRequest) {
// After  
export async function GET(_request: NextRequest) {
```

### 3. Critical Type Safety Issues
**Focus on**: API routes and payment handling
**Files**:
- `app/api/donations/initiate/route.ts` - Payment data
- `app/api/webhooks/stripe/route.ts` - Webhook data
- `app/api/communication/campaigns/[id]/route.ts` - Campaign data
**Fix**: Replace `any` with proper types
**Time**: ~15 minutes

## Non-Critical Issues (Add to Backlog)

### 1. Unused Imports (~200 occurrences)
**Pattern**: Imported but never used components/functions
**Impact**: Increases bundle size slightly
**Fix Strategy**: 
- Use ESLint auto-fix: `npx eslint . --fix`
- Review before committing to ensure nothing important is removed

### 2. Unused Variables (~150 occurrences)
**Pattern**: Destructured variables, old state variables
**Categories**:
- Intentionally unused (prefix with `_`)
- Dead code (remove)
- Future use (add TODO comment)

### 3. Missing Hook Dependencies (~30 occurrences)
**Pattern**: useEffect/useCallback missing dependencies
**Risk**: Usually safe but can cause stale closures
**Fix**: Add dependencies or use eslint-disable-next-line with explanation

### 4. Unescaped Entities (~10 occurrences)
**Pattern**: Apostrophes and quotes in JSX
**Fix**: Replace with HTML entities or use {`'`}

## Quick Wins (5 minutes)

### Bulk Fixes with ESLint
```bash
# Fix all auto-fixable issues
npx eslint . --fix

# Common fixes this handles:
# - Unused imports
# - prefer-const
# - Some formatting issues
```

## Components to Review for Removal

Based on the errors, these files might be unused:
1. `components/reports-content.old.tsx` - Has ".old" suffix
2. Multiple unused icon imports suggest refactored UI
3. Donation form components with many unused imports

## Recommended Approach

### Phase 1 (Now - 30 mins)
1. Fix critical React hook issue
2. Fix critical type safety in payment/API routes
3. Prefix unused params with `_` in API routes
4. Run build again

### Phase 2 (Next Sprint)
1. Run ESLint auto-fix
2. Review and remove dead code
3. Add proper types to remaining `any`
4. Configure ESLint rules to match team standards

### Phase 3 (Code Cleanup Sprint)
1. Remove unused components
2. Consolidate duplicate code
3. Add missing TypeScript types
4. Update dependencies

## ESLint Configuration Suggestions

Add to `.eslintrc.json` for more reasonable defaults:
```json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## Testing Strategy

After Phase 1 fixes:
1. Build with: `npm run build`
2. If still too many errors, temporarily add to `next.config.js`:
```javascript
eslint: {
  ignoreDuringBuilds: true,
}
```
3. Run production build and test functionality
4. Remove eslint ignore after Phase 2 cleanup

## Time Estimate
- Phase 1: 30 minutes (critical fixes)
- Phase 2: 2-3 hours (automated + review)
- Phase 3: 4-6 hours (full cleanup)

## Notes
- Many errors are in older components that may have been refactored
- Consider using a tool like `ts-prune` to find truly unused exports
- Set up pre-commit hooks to prevent future accumulation