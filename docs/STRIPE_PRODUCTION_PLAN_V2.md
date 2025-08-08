# 🚀 Stripe Integration Production Implementation Plan V2

## Project Status: ENHANCED
**Start Date:** January 8, 2025  
**Target Completion:** January 24, 2025  
**Current Phase:** Phase 3.5 - Banking Page Enhancement  

---

## 🎯 Core Philosophy
**"Keep Users in AltarFlow, Leverage Embedded Components"**
- Store gross amounts only (what donor paid)
- Use Stripe Reports API for financial reporting
- Fully embedded Stripe experience (no Express Dashboard)
- Focus on reconciliation and accurate reporting
- Users never leave AltarFlow

---

## 📊 Progress Tracker

### Overall Progress: ▓▓▓▓▓▓▓▓░░ 82%

| Phase | Status | Progress | Target Date |
|-------|--------|----------|-------------|
| **Phase 1: Simplified Transaction Model** | ✅ Completed | 100% | Jan 10 |
| **Phase 2: Refunds & Disputes** | ✅ Completed | 100% | Jan 13 |
| **Phase 3: Payout Reconciliation** | ✅ Completed | 100% | Jan 17 |
| **Phase 3.5: Banking Page Enhancement** | 🔄 In Progress | 10% | Jan 9 |
| **Phase 4: Financial Reporting** | ⏳ Not Started | 0% | Jan 20 |
| **Testing & Deployment** | ⏳ Not Started | 0% | Jan 24 |

---

## ✅ Completed Items

### Initial Setup (Completed)
- [x] Fixed donor creation with churchId
- [x] Fixed Stripe customer on Connect account
- [x] Fixed SQL injection vulnerabilities
- [x] Implemented input validation
- [x] Added rate limiting
- [x] Payment method detection working
- [x] Email receipts sending (mostly)

---

## 🔄 PHASE 1: Simplified Transaction Model
**Timeline:** 2-3 days | **Priority:** CRITICAL | **Status:** IN PROGRESS

### 1.1 Database Cleanup ✅
- [x] Remove fee-related columns from DonationTransaction:
  - `stripeFee` (will get from Stripe Reports)
  - `amountReceived` (will calculate from Stripe)
  - `stripePayoutId` (will track in PayoutSummary)
  - `paymentMethodDetails` (not needed)
- [x] Keep edit tracking fields for manual donation transparency
- [x] Add refund and dispute tracking fields
- [x] Create migration script
- [x] Update Prisma schema
- [x] Regenerate types

**Fields to Keep:**
```prisma
model DonationTransaction {
  id                          String       @id @default(cuid())
  churchId                    String       @db.Uuid
  donationTypeId              String
  donorId                     String?
  donorClerkId                String?
  donorName                   String?
  donorEmail                  String?
  amount                      Int          // Gross amount charged
  currency                    String
  status                      String       // succeeded/processing/refunded/disputed/failed
  paymentMethodType           String?
  stripePaymentIntentId       String?      @unique
  stripeCustomerId            String?
  transactionDate             DateTime     @default(now())
  processedAt                 DateTime?
  processingFeeCoveredByDonor Int?         @default(0)
  source                      String       @default("stripe")
  
  // Edit tracking for manual donations (keeping)
  editHistory                 Json?
  editReason                  String?
  lastEditedAt                DateTime?
  lastEditedBy                String?
  originalAmount              Int?
  
  // Refund tracking (new)
  refundedAmount              Int?         @default(0)
  refundedAt                  DateTime?
  
  // Dispute tracking (new)
  disputeStatus               String?
  disputeReason               String?
  disputedAt                  DateTime?
}
```

### 1.2 Webhook Simplification ✅
- [x] Remove fee calculation logic
- [x] Store only gross amounts
- [x] Focus on status updates

**Code Location:** `/app/api/webhooks/stripe/route.ts`

---

## 📦 PHASE 2: Refunds & Disputes
**Timeline:** 2-3 days | **Priority:** HIGH | **Status:** NOT STARTED

### 2.1 Refund Webhook Handlers ✅
- [x] Handle `charge.refunded` event
- [x] Update transaction status to 'refunded' or 'partially_refunded'
- [x] Store refunded amount
- [ ] Send notification email to church admin (TODO: when email system ready)

### 2.2 Dispute Webhook Handlers ✅
- [x] Handle `charge.dispute.created`
- [x] Handle `charge.dispute.updated`
- [x] Handle `charge.dispute.closed`
- [x] Update dispute status and reason
- [ ] Send urgent alert to church admin (TODO: when email system ready)

### 2.3 Dashboard Updates ✅
- [x] Add refund/dispute status badges
- [x] Show refunded amounts
- [x] Churches use Express Dashboard for Stripe management
- [x] Visual indicators for disputes needing response

**Code Location:** `/app/api/webhooks/stripe/route.ts`, `/components/donations-content.tsx`

---

## 🏦 PHASE 3: Payout Reconciliation
**Timeline:** 3-4 days | **Priority:** HIGH | **Status:** IN PROGRESS

### 3.1 Payout Configuration ✅
- [x] Churches control their own payout schedules via Banking page
- [x] System adapts to any schedule (daily/weekly/monthly/manual)
- [x] Embedded Stripe components handle schedule management

### 3.2 PayoutSummary Table ✅
```prisma
model PayoutSummary {
  id                  String       @id @default(cuid())
  payoutId            String       @unique
  churchId            String       @db.Uuid
  payoutDate          DateTime
  arrivalDate         DateTime
  amount              Int          // Total payout amount
  transactionCount    Int
  grossVolume         Int
  totalFees           Int
  totalRefunds        Int
  totalDisputes       Int
  netAmount           Int
  status              String       // pending/in_transit/paid/failed
  reconciledAt        DateTime?
  bankReference       String?
  createdAt           DateTime     @default(now())
  
  church              Church       @relation(fields: [churchId], references: [id])
  
  @@index([churchId])
  @@index([payoutDate])
}
```

### 3.3 Payout Webhook Handlers ✅
- [x] Handle `payout.created` event
- [x] Handle `payout.updated` event  
- [x] Handle `payout.paid` event
- [x] Handle `payout.failed` event
- [x] Handle `payout.canceled` event
- [x] Store payout records in PayoutSummary
- [x] Track payout status changes

### 3.4 Reconciliation Function ✅
- [x] Create reconciliation function in `/lib/stripe-reconciliation.ts`
- [x] Fetch balance transactions by payout ID
- [x] Calculate totals (gross, fees, refunds, net)
- [x] Update PayoutSummary with transaction details
- [x] Auto-reconcile when payout.paid webhook received
- [x] Manual reconciliation API endpoint `/api/reconcile`

### 3.5 Reconciliation Dashboard ✅
- [x] Show pending vs reconciled payouts
- [x] Display payout statistics (total, reconciled, pending, failed)
- [x] View transaction breakdowns (gross, fees, net)
- [x] Manual reconciliation triggers
- [x] Recent payouts table with status badges
- [ ] Export reconciliation report (future enhancement)
- [ ] Bank deposit matching UI (future enhancement)

**Code Location:** `/lib/reconciliation.ts`, `/app/api/cron/reconcile/route.ts`

---

## 🏦 PHASE 3.5: Banking Page Enhancement
**Timeline:** 1 day | **Priority:** HIGH | **Status:** IN PROGRESS

### 3.5.1 Embedded Onboarding Implementation 🔄
- [ ] Add new "Onboarding" tab for incomplete accounts
- [ ] Implement `ConnectAccountOnboarding` component
- [ ] Handle onboarding completion callbacks
- [ ] Fallback to hosted onboarding if needed
- [ ] Track drop-off points for analytics

### 3.5.2 Tab Structure Refinement 🔄
- [ ] Restructure tabs to: Onboarding | Account | Payments | Payouts
- [ ] Remove redundant "Balance" tab (covered in Payouts)
- [ ] Replace "Balance" with "Payments" (transactions, refunds, disputes)
- [ ] Add `ConnectNotificationBanner` to Account tab
- [ ] Remove "View Dashboard" button from StripeConnectButton

### 3.5.3 Smart Tab Visibility 🔄
- [ ] Hide Onboarding tab when account is fully verified
- [ ] Show Account tab only after initial onboarding
- [ ] Show Payments tab only when charges are enabled
- [ ] Show Payouts tab only when payouts are enabled
- [ ] Dynamic tab activation based on account status

### 3.5.4 Component Updates 🔄
```typescript
// Tab configuration based on account status
const getVisibleTabs = (account: StripeAccount) => {
  const tabs = [];
  
  // Show onboarding only if not fully verified
  if (!account?.details_submitted || account?.verificationStatus !== 'verified') {
    tabs.push({ id: 'onboarding', label: 'Setup', icon: 'Setup' });
  }
  
  // Always show account tab if account exists
  if (account?.id) {
    tabs.push({ id: 'account', label: 'Account', icon: 'User' });
  }
  
  // Show payments if charges enabled
  if (account?.charges_enabled) {
    tabs.push({ id: 'payments', label: 'Payments', icon: 'CreditCard' });
  }
  
  // Show payouts if payouts enabled
  if (account?.payouts_enabled) {
    tabs.push({ id: 'payouts', label: 'Payouts', icon: 'Bank' });
  }
  
  return tabs;
}
```

### 3.5.5 Testing Requirements 🔄
- [ ] Test embedded onboarding flow end-to-end
- [ ] Verify tab visibility logic for different account states
- [ ] Test notification banner for various alerts
- [ ] Ensure refunds/disputes work through Payments tab
- [ ] Verify no Express Dashboard dependency

**Benefits:**
- Users never leave AltarFlow
- Better analytics and tracking
- Consistent UI/UX
- Reduced friction in onboarding
- Complete control over user journey

**Code Locations:** 
- `/components/banking-content.tsx`
- `/components/stripe/StripeConnectEmbeddedWrapper.tsx`
- `/components/stripe-connect-button.tsx`

---

## 📊 PHASE 4: Financial Reporting
**Timeline:** 3-4 days | **Priority:** MEDIUM | **Status:** NOT STARTED

### 4.1 Stripe Reports API Integration ⏳
- [ ] Set up Reports API client
- [ ] Create report generation functions
- [ ] Cache report data
- [ ] Handle report webhooks

### 4.2 Financial Dashboard ⏳
- [ ] Weekly summary cards
- [ ] Gross vs Net visualization
- [ ] Fee analysis breakdown
- [ ] Trend charts
- [ ] Export to CSV/PDF

### 4.3 Tax Statements ⏳
- [ ] Annual donor statements (gross amounts)
- [ ] IRS-compliant format
- [ ] Bulk generation
- [ ] Email delivery with tracking

### 4.4 Church Financial Reports ⏳
- [ ] Monthly P&L statement
- [ ] Donor analytics
- [ ] Payment method breakdown
- [ ] Year-over-year comparisons

**Code Location:** `/lib/stripe-reports.ts`, `/components/financial-dashboard/`

---

## 🧪 TESTING PHASE
**Timeline:** 2-3 days | **Status:** NOT STARTED

### T.1 Integration Tests ⏳
- [ ] Webhook event processing
- [ ] Refund handling
- [ ] Dispute handling
- [ ] Reconciliation accuracy
- [ ] Report generation

### T.2 End-to-End Tests ⏳
- [ ] Complete donation flow
- [ ] Refund processing
- [ ] Weekly payout cycle
- [ ] Financial reporting

### T.3 Load Testing ⏳
- [ ] 100 concurrent donations
- [ ] Webhook bombardment
- [ ] Report generation under load

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Launch Requirements
- [ ] All webhook handlers tested
- [ ] Payout schedules configured
- [ ] Reconciliation jobs scheduled
- [ ] Reports API configured
- [ ] Email templates ready
- [ ] Documentation complete

### Launch Day Tasks
- [ ] Run database migrations
- [ ] Deploy webhook handlers
- [ ] Enable cron jobs
- [ ] Configure monitoring
- [ ] Test with small church first

### Post-Launch Monitoring
- [ ] Monitor webhook success rate
- [ ] Verify payout accuracy
- [ ] Check reconciliation reports
- [ ] Gather church feedback
- [ ] Iterate based on usage

---

## 📈 Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Transaction Recording | 100% | TBD | ⏳ |
| Refund Detection | 100% | TBD | ⏳ |
| Dispute Alerts | <1hr | TBD | ⏳ |
| Reconciliation Accuracy | 100% | TBD | ⏳ |
| Payout Success Rate | >99% | TBD | ⏳ |
| Report Generation Time | <5s | TBD | ⏳ |

---

## 📝 Architecture Decisions

### New Decisions (Jan 8, 2025)
- **Simplified Model**: Store only gross amounts, no fee tracking in DB
- **Stripe Reports API**: Use for all financial reporting
- **Fully Embedded Experience**: All Stripe operations within AltarFlow
- **Weekly Payouts**: Standardize all churches on Monday payouts
- **Reconciliation Focus**: Build robust matching with bank deposits
- **Smart Tab Visibility**: Show/hide tabs based on account status
- **No Express Dashboard**: Users never leave AltarFlow

### Updated: What We're Building
- ✅ Embedded onboarding experience
- ✅ Notification banner for alerts
- ✅ Payments tab for refunds/disputes
- ✅ Smart tab visibility logic

### What We're NOT Building
- ❌ Fee calculation in our database
- ❌ Express Dashboard dependencies
- ❌ Recurring donations (Phase 2 of product)

---

## 🔗 Key Integration Points

### Webhook Events (Priority Order)
1. `payment_intent.succeeded` ✅
2. `payment_intent.failed` ✅
3. `charge.refunded` 🔄
4. `charge.dispute.created` 🔄
5. `charge.dispute.updated` 🔄
6. `payout.paid` 📅
7. `payout.failed` 📅

### Stripe APIs We'll Use
1. **Payment Intents API** - Creating donations ✅
2. **Balance Transactions API** - Reconciliation ✅
3. **Payouts API** - Tracking deposits ✅
4. **Reports API** - Financial reporting
5. **Embedded Components API** - Onboarding, Payments, Account Management 🔄

---

## 🎯 Next Steps

### Immediate (Today - Jan 8)
1. ✅ Clean up DonationTransaction model
2. ✅ Remove fee tracking code  
3. ✅ Implement refund webhooks
4. 🔄 Implement banking page enhancements

### Tomorrow (Jan 9)
1. Complete embedded onboarding tab
2. Add notification banner to Account tab
3. Restructure tabs (Onboarding | Account | Payments | Payouts)
4. Implement smart tab visibility logic
5. Test complete embedded flow

### This Week (Jan 10-12)
1. Complete Phase 3.5 Banking Enhancement
2. Begin Phase 4 Financial Reporting
3. Integrate Stripe Reports API

### Next Week (Jan 13-17)
1. Complete financial dashboard
2. Implement tax statements
3. Test end-to-end with production data

---

## 📚 Resources

### Documentation
- [Stripe Connect Payouts](https://stripe.com/docs/connect/payouts)
- [Reconciliation with Payouts](https://stripe.com/docs/payouts/reconciliation)
- [Reports API](https://stripe.com/docs/reports)
- [Express Dashboard](https://stripe.com/docs/connect/express-dashboard)

### Support
- **Stripe Support**: support@stripe.com
- **Database**: Supabase Support
- **Monitoring**: Sentry

---

**Last Updated:** January 8, 2025 - Added Phase 3.5 Banking Enhancement  
**Next Review:** January 9, 2025 (Banking Enhancement Implementation)