# Altarflow: Stripe Connect Integration Implementation Plan

**Last Updated:** May 20, 2025  
**Version:** 1.1  
**Status:** Revised Draft

## 1. Overview

This document outlines the step-by-step plan to implement Stripe Connect integration for Altarflow, enabling churches to receive donations directly to their bank accounts. The implementation will follow a phased approach with testing at each stage.

## 2. Current Architecture Analysis

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Payment Processing**: Stripe Connect (Express Accounts for MVP)

### Existing Components
- Banking dashboard with tabs for account, payouts, tax, and settings
- Basic UI structure in place using shadcn/ui components
- i18n support for English and Spanish

## 3. Implementation Phases

### Phase 1: Setup & Configuration (Week 1)

#### 1.1 Backend Setup
- [ ] Install Stripe Node.js SDK
- [ ] Create API routes for Stripe Connect operations
- [ ] Set up environment variables for Stripe API keys
- [ ] Implement database schema for storing Stripe Express account references (e.g., `church_id`, `stripe_account_id`, `status`, `details_submitted`, `charges_enabled`, `payouts_enabled`).
- [ ] Design API endpoints with idempotency keys.
- [ ] Emphasize secure management of Stripe API keys (server-side only, use environment variable stores).

#### 1.2 Frontend Setup
- [ ] Create Stripe Connect onboarding component (to initiate redirect to Stripe Express and handle return).
- [ ] Add loading and error states
- [ ] Implement i18n for new strings

#### 1.3 Testing
- [ ] Unit tests for API routes
- [ ] Component tests for new UI elements
- [ ] E2E test for the onboarding flow

### Phase 2: Account Connection (Week 2)

#### 2.1 Backend
- [ ] Implement account creation endpoint (for Stripe Express, this involves generating an account link).
- [ ] Create webhook handlers for Stripe events (e.g., `account.updated`, `capability.updated`) and ensure verification of webhook signatures.
- [ ] Store Stripe account details securely

#### 2.2 Frontend
- [ ] Build account connection flow
- [ ] Add success/error handling
- [ ] Implement account status indicators.
- [ ] Display connected Stripe account status and available balance (fetched via backend) on the 'Account' or 'Payouts' tab.

#### 2.3 Testing
- [ ] Test account connection in test mode
- [ ] Verify webhook handling
- [ ] Test error scenarios

### Phase 3: Donation Types Management (Week 3)

#### 3.1 Backend
- [ ] Create API for managing donation types
- [ ] Implement validation for donation types
- [ ] Add database schema for donation types (e.g., `church_id`, `type_name`, `description`, `is_recurring_allowed`, `default_amount`).

#### 3.2 Frontend
- [ ] Build donation types management UI
- [ ] Add form validation
- [ ] Implement sorting and filtering

#### 3.3 Testing
- [ ] Test CRUD operations for donation types
- [ ] Verify validation rules
- [ ] Test with different user roles

### Phase 4: Integration with Donation Flow (Week 4)

#### 4.1 Backend
- [ ] Create payment intent endpoints
- [ ] Implement webhook handlers for payment events
- [ ] Add transaction recording

#### 4.2 Frontend
- [ ] Update donation form to use connected account
- [ ] Add payment status indicators
- [ ] Implement receipt generation

#### 4.3 Testing
- [ ] End-to-end donation flow
- [ ] Test different payment methods
- [ ] Verify webhook handling

## 4. Detailed Implementation Plan

### Week 1: Setup & Configuration

#### Day 1-2: Backend Foundation
1. Set up Stripe SDK and environment variables
2. Create base API routes
3. Implement database migrations

#### Day 3-4: Frontend Foundation
1. Create Stripe Connect onboarding component
2. Set up i18n for new strings
3. Implement loading and error states

#### Day 5: Testing & Documentation
1. Write unit tests
2. Document API endpoints
3. Create developer documentation

### Week 2: Account Connection

#### Day 1-2: Backend Implementation
1. Implement account creation endpoint
2. Set up webhook handlers
3. Create account status tracking

#### Day 3-4: Frontend Implementation
1. Build account connection UI
2. Implement status indicators
3. Add error handling

#### Day 5: Testing & Review
1. Test connection flow
2. Verify webhook handling
3. Conduct code review

### Week 3: Donation Types Management

#### Day 1-2: Backend Implementation
1. Create donation types API
2. Implement validation
3. Set up database schema

#### Day 3-4: Frontend Implementation
1. Build management UI
2. Add form validation
3. Implement sorting/filtering

#### Day 5: Testing & Review
1. Test all CRUD operations
2. Verify validation
3. Conduct code review

### Week 4: Integration & Testing

#### Day 1-2: Backend Integration
1. Implement payment intents
2. Set up webhook handlers
3. Add transaction recording

#### Day 3-4: Frontend Integration
1. Update donation form
2. Add payment status
3. Implement receipts

#### Day 5: Final Testing & Deployment
1. End-to-end testing
2. Performance testing
3. Deploy to staging

## 5. Testing Strategy

### Unit Testing
- Test individual components and functions
- Mock external dependencies
- Achieve 80%+ code coverage

### Integration Testing
- Test API endpoints
- Verify database interactions
- Test authentication/authorization

### End-to-End Testing
- Test complete user flows
- Verify payment processing
- Test error scenarios

## 6. Deployment Plan

### Staging
1. Deploy to staging environment
2. Conduct UAT
3. Fix any issues

### Production
1. Deploy to production
2. Monitor for issues
3. Rollback plan in place

## 7. Success Metrics

1. Successful account connection rate > 95%
2. Payment success rate > 98%
3. Average page load time < 2s
4. Error rate < 0.1%

## 8. Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation

---

*This document will be updated as the implementation progresses and requirements evolve.*