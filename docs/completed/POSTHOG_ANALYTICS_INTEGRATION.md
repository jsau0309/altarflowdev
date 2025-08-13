# PostHog Analytics Integration Plan

## Overview
Implement comprehensive analytics tracking across AltarFlow using PostHog for user behavior insights, feature adoption tracking, and data-driven decision making.

## Why PostHog?
- **Open Source**: Can self-host for data privacy compliance
- **GDPR Compliant**: Built with privacy in mind
- **Feature Flags**: A/B testing capabilities included
- **Session Recording**: Understand user journeys
- **No Personal Data Required**: Can track without storing PII

## Integration Phases

### Phase 1: Basic Setup (Week 1)
1. **Installation & Configuration**
   ```bash
   npm install posthog-js
   npm install @posthog/next # Next.js specific package
   ```

2. **Environment Setup**
   ```env
   NEXT_PUBLIC_POSTHOG_KEY=your-project-api-key
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com # or self-hosted URL
   ```

3. **Provider Setup**
   - Create `providers/posthog-provider.tsx`
   - Initialize PostHog in `_app.tsx` or `layout.tsx`
   - Configure for both client and server-side tracking

4. **Privacy Controls**
   - Implement opt-in/opt-out mechanism
   - Add cookie consent banner
   - Configure data retention policies

### Phase 2: Core Event Tracking (Week 2)

#### User Authentication Events
- `user_signed_up` - New user registration
- `user_signed_in` - User login
- `user_signed_out` - User logout
- `organization_created` - New church setup
- `organization_switched` - Church context change

#### Financial Events
- `donation_created` - Track donation amounts (anonymized)
- `donation_method_selected` - Payment method choices
- `expense_created` - Expense tracking
- `report_generated` - Financial report views

#### Member Management Events
- `member_added` - New member registration
- `member_updated` - Profile updates
- `member_status_changed` - Active/inactive changes
- `visitor_added` - Visitor tracking

#### Communication Events
- `email_campaign_created` - Campaign creation
- `email_campaign_sent` - Campaign dispatch
- `email_opened` - Track open rates
- `email_link_clicked` - Engagement metrics

#### AI Feature Events
- `ai_summary_generated` - Track AI usage
- `ai_followup_question_asked` - Question types and frequency
- `ai_error_occurred` - AI feature failures

### Phase 3: Advanced Analytics (Week 3)

#### Custom Properties
```typescript
// Church context
posthog.setPersonProperties({
  church_id: hashedChurchId,
  plan_type: 'pro' | 'basic',
  church_size: 'small' | 'medium' | 'large',
  language_preference: 'en' | 'es'
})
```

#### Funnel Analysis Setup
1. **Donation Funnel**
   - View donation page → Select amount → Choose method → Complete donation

2. **Member Onboarding Funnel**
   - Church signup → Add first member → Send first email → View reports

3. **AI Feature Adoption Funnel**
   - View dashboard → Open AI modal → Generate summary → Ask follow-up

#### Feature Flags
```typescript
// A/B test new features
const showNewDashboard = posthog.getFeatureFlag('new-dashboard-design')
const aiSummaryV2 = posthog.getFeatureFlag('ai-summary-v2')
```

### Phase 4: Performance & Insights (Week 4)

#### Page Performance Tracking
```typescript
// Track page load times
posthog.capture('page_performance', {
  page: window.location.pathname,
  load_time: performance.now(),
  connection_type: navigator.connection?.effectiveType
})
```

#### Error Tracking (complement to Sentry)
```typescript
// Track user-facing errors
posthog.capture('error_occurred', {
  error_type: 'payment_failed',
  error_message: 'Stripe connection timeout',
  user_action: 'donation_attempt'
})
```

#### Custom Dashboards
1. **Church Admin Dashboard**
   - Active churches by plan type
   - Feature adoption rates
   - Revenue metrics

2. **Product Health Dashboard**
   - API response times
   - Error rates by feature
   - User engagement scores

3. **AI Usage Dashboard**
   - Questions asked per church
   - Language distribution
   - Peak usage times

## Implementation Checklist

### Frontend Integration
- [ ] Install PostHog packages
- [ ] Create PostHog provider component
- [ ] Add to app layout/root
- [ ] Implement user identification
- [ ] Add event tracking helpers
- [ ] Create custom hooks (usePostHog)
- [ ] Add error boundary tracking

### Backend Integration
- [ ] Install PostHog Node SDK
- [ ] Track server-side events
- [ ] Implement webhook endpoints
- [ ] Add API route tracking
- [ ] Configure batch processing

### Privacy & Compliance
- [ ] Implement cookie consent
- [ ] Add opt-out mechanism
- [ ] Configure data anonymization
- [ ] Set up data retention rules
- [ ] Document privacy policy updates
- [ ] Test GDPR compliance

### Testing Strategy
- [ ] Unit tests for tracking functions
- [ ] Integration tests for events
- [ ] Verify data accuracy
- [ ] Test opt-out functionality
- [ ] Load test tracking endpoints

## Code Examples

### 1. PostHog Provider
```typescript
// providers/posthog-provider.tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

export function PHProvider({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = useAuth()

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      },
      autocapture: false, // We'll track manually for better control
      capture_pageview: false, // Custom implementation
    })

    // Identify user
    if (userId) {
      posthog.identify(userId, {
        organization_id: orgId,
      })
    }
  }, [userId, orgId])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
```

### 2. Custom Hook
```typescript
// hooks/use-analytics.ts
import { usePostHog } from 'posthog-js/react'

export function useAnalytics() {
  const posthog = usePostHog()

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (!posthog) return
    
    // Add common properties
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      language: navigator.language,
      church_id: getHashedChurchId(), // Implement hashing
    }

    posthog.capture(eventName, enrichedProperties)
  }

  return { trackEvent }
}
```

### 3. AI Feature Tracking
```typescript
// Track AI summary usage
const trackAISummary = (action: string, details: any) => {
  trackEvent('ai_summary_interaction', {
    action,
    question_key: details.questionKey,
    response_time: details.responseTime,
    language: details.language,
    error: details.error || null,
  })
}
```

## Success Metrics

### Month 1
- [ ] 95% of user sessions tracked
- [ ] Core events implemented
- [ ] No PII leakage confirmed

### Month 3
- [ ] 3+ custom dashboards live
- [ ] Feature adoption insights delivered
- [ ] A/B test results actionable

### Month 6
- [ ] Reduced churn by 10%
- [ ] Increased feature adoption by 25%
- [ ] Data-driven roadmap established

## Maintenance Plan
- Weekly data quality checks
- Monthly dashboard reviews
- Quarterly privacy audits
- Bi-annual implementation review

## Resources
- [PostHog Next.js Guide](https://posthog.com/docs/libraries/next-js)
- [PostHog API Reference](https://posthog.com/docs/api)
- [Privacy Best Practices](https://posthog.com/docs/privacy)