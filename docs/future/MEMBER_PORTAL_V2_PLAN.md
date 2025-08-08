# 🚀 Member Portal V2 Implementation Plan

## Executive Summary
A comprehensive self-service portal for church members to manage recurring donations, view giving history, download tax statements, and update their profiles. This represents a major upgrade to AltarFlow, transforming it from an admin-only platform to a full congregation engagement system.

**Target Launch:** Q2 2025  
**Development Time:** 8-10 weeks  
**Priority:** HIGH - Revenue Impact Feature  

---

## 📊 Business Case

### Revenue Impact
- **Recurring Revenue:** 40-60% increase in donation volume (industry average)
- **Donor Retention:** 80% higher lifetime value for recurring donors
- **Reduced Admin Time:** 10+ hours/month saved on manual tasks
- **Tax Season Efficiency:** 90% reduction in statement generation time

### Key Metrics to Track
- Monthly Recurring Revenue (MRR) per church
- Portal adoption rate (% of donors with accounts)
- Recurring donor conversion rate
- Self-service task completion rate
- Support ticket reduction

---

## 🏗️ Technical Architecture

### Database Schema Extensions

```prisma
// 1. Member Portal Access
model Member {
  id                    String      @id @default(cuid())
  churchId              String      @db.Uuid
  clerkId               String?     @unique
  email                 String
  firstName             String
  lastName              String
  
  // Portal access fields (NEW)
  portalAccessEnabled   Boolean     @default(false)
  portalPassword        String?     // Hashed password
  portalInviteSentAt    DateTime?
  portalInviteToken     String?     @unique
  portalInviteExpiresAt DateTime?
  lastPortalLoginAt     DateTime?
  portalPreferences     Json?       // Language, email prefs, etc.
  
  // Relationships
  donations             DonationTransaction[]
  recurringDonations    RecurringDonation[]
  paymentMethods        PaymentMethod[]
  taxStatements         TaxStatement[]
  
  @@index([email, churchId])
  @@index([portalInviteToken])
}

// 2. Recurring Donations
model RecurringDonation {
  id                    String      @id @default(cuid())
  memberId              String
  churchId              String      @db.Uuid
  stripeSubscriptionId  String      @unique
  stripeCustomerId      String
  
  // Donation details
  amount                Int         // Amount in cents
  currency              String      @default("usd")
  frequency             String      // weekly/biweekly/monthly/yearly
  donationTypeId        String
  coverFees             Boolean     @default(false)
  feeAmount             Int?        // Calculated fee if covered
  
  // Schedule
  status                String      // active/paused/cancelled/past_due
  startDate             DateTime
  nextChargeDate        DateTime?
  pausedAt              DateTime?
  cancelledAt           DateTime?
  cancelReason          String?
  
  // Metadata
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  // Relationships
  member                Member      @relation(fields: [memberId], references: [id])
  church                Church      @relation(fields: [churchId], references: [id])
  donationType          DonationType @relation(fields: [donationTypeId], references: [id])
  transactions          DonationTransaction[]
  
  @@index([memberId])
  @@index([churchId])
  @@index([status])
  @@index([nextChargeDate])
}

// 3. Payment Methods
model PaymentMethod {
  id                    String      @id @default(cuid())
  memberId              String
  stripePaymentMethodId String      @unique
  
  // Card details (from Stripe)
  type                  String      // card/bank_account
  last4                 String
  brand                 String?     // visa/mastercard/amex
  expMonth              Int?
  expYear               Int?
  isDefault             Boolean     @default(false)
  
  // Metadata
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  member                Member      @relation(fields: [memberId], references: [id])
  
  @@index([memberId])
}

// 4. Tax Statements
model TaxStatement {
  id                    String      @id @default(cuid())
  memberId              String
  churchId              String      @db.Uuid
  year                  Int
  
  // Document details
  statementNumber       String      @unique // CHURCH-YEAR-0001
  totalAmount           Int         // Total donations for the year
  documentUrl           String?     // S3/Cloudflare URL
  
  // Generation tracking
  generatedAt           DateTime    @default(now())
  generatedBy           String?     // admin/system/member
  emailedAt             DateTime?
  downloadedAt          DateTime?
  
  // Amendments
  isAmended             Boolean     @default(false)
  amendedFrom           String?     // Previous statement ID
  amendmentReason       String?
  
  member                Member      @relation(fields: [memberId], references: [id])
  church                Church      @relation(fields: [churchId], references: [id])
  
  @@unique([memberId, churchId, year])
  @@index([churchId, year])
}

// 5. Portal Activity Log
model PortalActivity {
  id                    String      @id @default(cuid())
  memberId              String
  action                String      // login/view_donations/download_statement/update_recurring
  metadata              Json?       // Additional context
  ipAddress             String?
  userAgent             String?
  createdAt             DateTime    @default(now())
  
  @@index([memberId])
  @@index([createdAt])
}
```

### API Architecture

```typescript
// API Routes Structure
/api/portal/
├── auth/
│   ├── login           // Member login with email/password
│   ├── logout          // Clear session
│   ├── forgot-password // Send reset link
│   ├── reset-password  // Update password
│   └── verify-invite   // Accept portal invitation
│
├── member/
│   ├── profile         // GET/PUT member info
│   ├── preferences     // GET/PUT portal settings
│   └── notifications   // GET notification preferences
│
├── donations/
│   ├── history         // GET paginated donation history
│   ├── recurring       // GET/POST/PUT/DELETE recurring donations
│   ├── summary         // GET donation summary stats
│   └── receipt/[id]    // GET individual receipt PDF
│
├── payment-methods/
│   ├── list            // GET saved payment methods
│   ├── add             // POST add new payment method
│   ├── update/[id]     // PUT update (set default)
│   └── delete/[id]     // DELETE remove payment method
│
├── tax-statements/
│   ├── list            // GET available statements
│   ├── generate        // POST generate for specific year
│   └── download/[id]   // GET statement PDF
│
└── webhooks/
    └── stripe/         // Handle subscription events
        ├── subscription.created
        ├── subscription.updated
        ├── subscription.deleted
        ├── invoice.payment_succeeded
        └── invoice.payment_failed
```

---

## 🎨 User Interface Design

### Portal Structure

```
/portal (Public routes - no church context)
├── /login                    // Email + password
├── /forgot-password          // Reset flow
├── /invite/[token]          // Accept invitation
│
/portal/[churchSlug]         // Church-specific portal
├── /dashboard               // Overview + quick actions
├── /donations
│   ├── /history            // All donations with filters
│   ├── /recurring          // Manage recurring gifts
│   └── /receipts           // Download receipts
├── /payment-methods        // Manage cards/banks
├── /tax-statements         // Download statements
├── /profile                // Update personal info
└── /settings               // Preferences
```

### Key UI Components

```typescript
// 1. Dashboard Component
<MemberDashboard>
  <WelcomeHeader />           // Personalized greeting
  <GivingSummaryCards />       // YTD, Last Month, Lifetime
  <RecentDonations />          // Last 5 transactions
  <RecurringDonationCard />    // Active recurring with next date
  <QuickActions />             // Download statement, update payment
</MemberDashboard>

// 2. Recurring Donation Manager
<RecurringDonationManager>
  <ActiveSubscriptions />      // List with pause/cancel
  <CreateRecurring>
    <AmountSelector />         // Suggested amounts + custom
    <FrequencyPicker />        // Weekly/Biweekly/Monthly/Yearly
    <FundSelector />           // Which fund to support
    <FeeCoverageToggle />      // Option to cover processing fees
    <PaymentMethodPicker />    // Select or add new
  </CreateRecurring>
</RecurringDonationManager>

// 3. Donation History
<DonationHistory>
  <DateRangeFilter />         // Similar to admin reports
  <SearchBar />                // Search by amount, fund
  <DonationTable>
    <DonationRow>              // Date, Amount, Fund, Receipt
      <DownloadReceipt />      // PDF download
      <ViewDetails />          // Modal with full info
    </DonationRow>
  </DonationTable>
  <Pagination />
  <ExportOptions />            // CSV export
</DonationHistory>

// 4. Tax Statement Center
<TaxStatementCenter>
  <YearSelector />             // 2024, 2023, 2022...
  <StatementCard>
    <PreviewThumbnail />       // PDF preview
    <DownloadButton />         // Generate if needed
    <EmailButton />            // Send to email
    <AmendmentBadge />         // If amended
  </StatementCard>
  <StatementHistory />         // Download history
</TaxStatementCenter>
```

---

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Basic authentication and portal structure

- [ ] Database migrations for new tables
- [ ] Member authentication system (separate from admin)
- [ ] Portal invitation system
- [ ] Basic portal layout and navigation
- [ ] Member profile management
- [ ] Activity logging

**Deliverables:**
- Members can receive invites and create portal accounts
- Basic dashboard showing member info
- Profile update functionality

### Phase 2: Donation History (Week 3-4)
**Goal:** View historical giving

- [ ] Donation history API with pagination
- [ ] Donation history UI with filters
- [ ] Receipt generation and download
- [ ] Donation summary statistics
- [ ] Search and export functionality

**Deliverables:**
- Complete donation history view
- PDF receipts for individual donations
- CSV export of donation data

### Phase 3: Payment Methods (Week 5)
**Goal:** Manage payment methods via Stripe

- [ ] Stripe SetupIntent integration
- [ ] Payment method addition flow
- [ ] Payment method management UI
- [ ] Default payment method selection
- [ ] Security (PCI compliance)

**Deliverables:**
- Add/remove credit cards and bank accounts
- Set default payment method
- Secure tokenization via Stripe

### Phase 4: Recurring Donations (Week 6-7)
**Goal:** Create and manage recurring gifts

- [ ] Stripe Subscriptions integration
- [ ] Recurring donation creation flow
- [ ] Management UI (pause/resume/cancel)
- [ ] Subscription webhook handlers
- [ ] Failed payment recovery flow
- [ ] Email notifications

**Deliverables:**
- Create recurring donations with various frequencies
- Manage active subscriptions
- Automated retry logic for failed payments

### Phase 5: Tax Statements (Week 8)
**Goal:** Self-service tax document generation

- [ ] Tax statement PDF template
- [ ] Generation logic with caching
- [ ] Statement management UI
- [ ] Bulk generation for admins
- [ ] Amendment handling
- [ ] IRS compliance validation

**Deliverables:**
- On-demand tax statement generation
- Historical statement access
- Admin tools for bulk operations

### Phase 6: Polish & Launch Prep (Week 9-10)
**Goal:** Production readiness

- [ ] Email notification system
- [ ] Internationalization (Spanish)
- [ ] Mobile responsive design
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Beta testing with select churches

**Deliverables:**
- Fully tested and optimized portal
- Complete documentation
- Training materials for churches

---

## 🔒 Security Considerations

### Authentication Security
```typescript
// Separate auth context from admin
- Member passwords stored with bcrypt
- Session management with JWT
- Rate limiting on login attempts
- Password complexity requirements
- Two-factor authentication (optional)
- Magic link option for passwordless
```

### Data Access Control
```typescript
// Strict church isolation
- Members can only access their church's portal
- Can only view their own donations
- Cannot access other members' data
- Admins can impersonate for support
```

### PCI Compliance
```typescript
// Payment data handling
- Never store card numbers
- Use Stripe's PCI-compliant tokenization
- HTTPS everywhere
- Security headers (CSP, HSTS, etc.)
- Regular security audits
```

### Privacy Controls
```typescript
// GDPR/CCPA compliance
- Data export functionality
- Account deletion requests
- Consent management
- Privacy policy acceptance
- Audit trail of data access
```

---

## 📧 Communication Strategy

### Email Templates Needed

1. **Portal Invitation**
   - Subject: "You're invited to [Church Name]'s Member Portal"
   - Personalized invite link
   - Benefits of joining
   - Simple CTA button

2. **Recurring Donation Confirmation**
   - Subject: "Your recurring gift is set up"
   - Donation details
   - Next charge date
   - Management link

3. **Payment Failure**
   - Subject: "Action needed: Payment issue"
   - Failure reason
   - Update payment method link
   - Grace period info

4. **Tax Statement Ready**
   - Subject: "Your 2024 tax statement is ready"
   - Download link
   - Summary of giving
   - Thank you message

5. **Recurring Donation Reminder**
   - Subject: "Upcoming donation on [date]"
   - Amount and fund
   - Option to skip or modify
   - Payment method reminder

### In-App Notifications

```typescript
// Notification types
- Donation successful
- Payment method expiring
- Tax statement available
- Recurring donation modified
- Profile updated
```

---

## 📊 Analytics & Metrics

### Portal Metrics Dashboard

```typescript
// Key metrics to track
interface PortalMetrics {
  // Adoption
  totalMembersInvited: number
  portalActivationRate: number // Accepted invites
  monthlyActiveUsers: number
  
  // Engagement
  avgSessionDuration: number
  pagesPerSession: number
  featureUsage: {
    donationHistory: number
    recurringManagement: number
    taxStatements: number
    paymentMethods: number
  }
  
  // Financial Impact
  recurringDonationMRR: number
  recurringVsOneTime: number // Ratio
  avgRecurringAmount: number
  churnRate: number
  lifetimeValue: number
  
  // Operational
  selfServiceRate: number // Tasks completed without support
  supportTicketReduction: number
  statementDownloads: number
}
```

### Success Criteria

| Metric | Target | Measurement Period |
|--------|--------|-------------------|
| Portal Adoption | 60% of active donors | 6 months |
| Recurring Conversion | 25% of portal users | 3 months |
| MRR Increase | 40% | 6 months |
| Support Ticket Reduction | 30% | 3 months |
| Member Satisfaction | 4.5/5 | Ongoing |

---

## 🚀 Launch Strategy

### Soft Launch (Week 1-2)
- 3-5 beta churches
- Full feature access
- Daily monitoring
- Rapid iteration on feedback

### Gradual Rollout (Week 3-4)
- 10% of churches per day
- Monitor system load
- Gather feedback
- Fix issues before expanding

### Full Launch (Week 5)
- All churches enabled
- Marketing campaign
- Training webinars
- Success stories

### Post-Launch (Ongoing)
- Monthly feature updates
- Quarterly business reviews
- Annual tax season prep
- Continuous optimization

---

## 💰 Pricing Considerations

### Potential Pricing Models

1. **Included in Base** (Recommended)
   - Portal access included for all plans
   - Drives platform stickiness
   - Competitive advantage

2. **Usage-Based**
   - Free for up to 100 members
   - $0.50/member/month after
   - Scales with church size

3. **Feature Tiers**
   - Basic: History & statements (free)
   - Premium: Recurring donations ($29/mo)
   - Enterprise: Custom branding ($99/mo)

### ROI Calculation for Churches

```
Example: 100-member church
- Current: 20% give regularly = 20 donors
- With Portal: 35% give regularly = 35 donors
- Average gift: $200/month
- Additional revenue: 15 × $200 = $3,000/month
- Platform cost: $99/month
- ROI: 30x
```

---

## 🔧 Technical Dependencies

### External Services
- **Stripe**: Subscriptions, Payment Methods, SetupIntents
- **Resend**: Transactional emails
- **Cloudflare R2**: Tax statement storage
- **Clerk**: Authentication (or build custom)
- **PDF Generation**: React PDF or Puppeteer

### Infrastructure Needs
- **Database**: Indexes for member queries
- **Caching**: Redis for statement caching
- **Queue**: BullMQ for async jobs
- **Monitoring**: Sentry for error tracking
- **Analytics**: PostHog or Mixpanel

---

## 🎯 Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| High database load | Performance issues | Implement caching, read replicas |
| Payment failures | Lost revenue | Automated retry logic, dunning emails |
| Security breach | Trust loss | Regular audits, penetration testing |
| Stripe API changes | Feature breakage | Version pinning, monitoring |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Low adoption | Poor ROI | Onboarding campaign, incentives |
| Feature complexity | User confusion | Progressive disclosure, tutorials |
| Support overload | Team stress | Self-service docs, FAQs |
| Compliance issues | Legal problems | Legal review, clear policies |

---

## 📚 Documentation Needs

### For Churches
- Admin guide for inviting members
- Portal benefits one-pager
- FAQ document
- Video tutorials

### For Members
- Getting started guide
- How to set up recurring
- Tax statement FAQ
- Payment method management

### For Developers
- API documentation
- Database schema docs
- Deployment guide
- Troubleshooting guide

---

## ✅ Pre-Launch Checklist

### Technical
- [ ] Load testing completed (1000+ concurrent users)
- [ ] Security audit passed
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Error tracking setup

### Business
- [ ] Pricing finalized
- [ ] Legal review completed
- [ ] Support team trained
- [ ] Marketing materials ready
- [ ] Launch metrics defined

### Documentation
- [ ] User guides written
- [ ] API docs complete
- [ ] Video tutorials recorded
- [ ] FAQs published
- [ ] Email templates approved

---

## 🎉 Success Celebration Milestones

1. **First Portal Registration** 🎊
2. **First Recurring Donation** 💰
3. **100 Active Members** 📈
4. **$10,000 MRR in Recurring** 🚀
5. **1,000 Tax Statements Generated** 📋
6. **50% Adoption Rate** 🏆

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** Before Phase 1 Start  
**Owner:** AltarFlow Development Team

---

## Appendix A: Stripe Subscription Webhook Events

```typescript
// Critical webhook events to handle
const SUBSCRIPTION_WEBHOOKS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.created',
  'invoice.finalized',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'payment_method.attached',
  'payment_method.detached',
  'payment_method.updated',
] as const
```

## Appendix B: Database Indexes Strategy

```sql
-- Optimize common queries
CREATE INDEX idx_donations_member_date ON DonationTransaction(donorId, transactionDate DESC);
CREATE INDEX idx_recurring_member_status ON RecurringDonation(memberId, status);
CREATE INDEX idx_recurring_next_charge ON RecurringDonation(nextChargeDate, status);
CREATE INDEX idx_statements_member_year ON TaxStatement(memberId, year DESC);
CREATE INDEX idx_portal_activity_member ON PortalActivity(memberId, createdAt DESC);
```

## Appendix C: Sample Tax Statement Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Professional PDF styling */
    body { font-family: 'Arial', sans-serif; }
    .header { border-bottom: 2px solid #000; }
    .church-info { margin-bottom: 30px; }
    .donor-info { margin-bottom: 30px; }
    .donation-table { width: 100%; }
    .donation-table th { background: #f0f0f0; }
    .total-row { font-weight: bold; border-top: 2px solid #000; }
    .footer { margin-top: 50px; font-size: 12px; }
    .signature-line { border-bottom: 1px solid #000; width: 200px; }
  </style>
</head>
<body>
  <!-- Template content here -->
</body>
</html>
```