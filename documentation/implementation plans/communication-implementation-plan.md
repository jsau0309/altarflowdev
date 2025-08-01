# Email Communication Feature Implementation Plan

## Overview
Implement a newsletter-style email communication system where churches can send up to 4 emails per month to their members using Unlayer for drag-and-drop editing and Resend for delivery.

## Phase 1: Database & Infrastructure (Week 1)

### 1.1 Database Schema
- [ ] Create Prisma schema updates with email tables
- [ ] Generate and run Prisma migrations
- [ ] Create Supabase RLS policies migrations
- [ ] Test database relationships and constraints

### 1.2 Resend Integration Setup
- [ ] Configure Resend API in environment variables
- [ ] Create email service wrapper for Resend SDK
- [ ] Set up webhook endpoints for delivery tracking
- [ ] Implement bounce and unsubscribe webhook handlers

### 1.3 Email Templates
- [ ] Create base email layout template with:
  - Header with logo placeholder
  - "View in browser" link
  - Content area
  - Footer with church address
  - Unsubscribe link
- [ ] Implement template rendering with church branding

## Phase 2: Core Email Management (Week 2)

### 2.1 Email Settings Page
- [ ] Create `/dashboard/communication/settings` page
- [ ] Implement form for:
  - Church logo upload
  - Primary color picker
  - Timezone selector
  - Footer address
- [ ] Save settings to EmailSettings table

### 2.2 Email Campaign List
- [ ] Create `/dashboard/communication` main page
- [ ] Display campaigns table with:
  - Subject, status, scheduled date
  - Recipients count
  - Sent by user
  - Actions (edit, preview, delete)
- [ ] Add quota indicator (X/4 emails this month)
- [ ] Implement pagination and filtering

### 2.3 Member Selection Component
- [ ] Create member picker with:
  - Select all/none functionality
  - Search by name/email
  - Show unsubscribed members separately
  - Display valid email count
- [ ] Exclude members without emails
- [ ] Show subscription status

## Phase 3: Email Editor Integration (Week 3)

### 3.1 Unlayer Integration
- [ ] Install and configure Unlayer React SDK
- [ ] Create `/dashboard/communication/new` page
- [ ] Implement editor with:
  - Church branding pre-applied
  - Restricted to white background
  - Text, image, and button blocks only
  - Mobile/desktop preview toggle

### 3.2 Campaign Creation Flow
- [ ] Subject line and preview text inputs
- [ ] AI-powered subject line generator (OpenAI)
- [ ] AI-powered preview text generator (Claude)
- [ ] Member selection step
- [ ] Schedule or send immediately options
- [ ] Test email functionality
- [ ] Save as draft capability

### 3.3 Email Preview & Testing
- [ ] Implement preview modal
- [ ] Add "Send test email" button
- [ ] Show mobile and desktop views
- [ ] Display selected recipients count

## Phase 4: Sending & Scheduling (Week 4)

### 4.1 Email Sending Service
- [ ] Create background job for email sending
- [ ] Implement batch sending (50 emails at a time)
- [ ] Add retry logic for failed sends
- [ ] Update recipient statuses in real-time

### 4.2 Scheduling System
- [ ] Create scheduler for future emails
- [ ] Respect church timezone settings
- [ ] Maximum 14 days advance scheduling
- [ ] Cancel scheduled emails functionality

### 4.3 Quota Management
- [ ] Track emails sent per month
- [ ] Reset quota on 1st of each month
- [ ] Disable send button when quota reached
- [ ] Show clear quota status messages

## Phase 5: Analytics & Compliance (Week 5)

### 5.1 Delivery Tracking
- [ ] Process Resend webhooks for:
  - Delivered status
  - Bounce notifications
  - Unsubscribe events
- [ ] Update EmailRecipient records
- [ ] Mark invalid emails after multiple bounces

### 5.2 Unsubscribe Management
- [ ] Create public unsubscribe page
- [ ] Generate unique unsubscribe tokens
- [ ] Update member preferences
- [ ] Show unsubscribed members in UI

### 5.3 Error Handling
- [ ] Implement error notifications:
  - Failed email sends
  - Scheduling failures
  - Quota exceeded attempts
- [ ] Send error emails to church admin
- [ ] Log errors for debugging

## Phase 6: AI-Powered Content Generation

### 6.1 AI Integration Setup
- [ ] Install Anthropic Claude SDK (@anthropic-ai/sdk)
- [ ] Configure Claude API key in environment variables
- [ ] Create unified AI service wrapper for both OpenAI and Claude
- [ ] Implement error handling and fallbacks

### 6.2 Subject Line Generation (OpenAI)
- [ ] Create /api/ai/generate-subject-lines endpoint
- [ ] Extract email content summary from Unlayer editor
- [ ] Implement tone selection (friendly, formal, urgent, celebratory, informative)
- [ ] Generate 5 suggestions with character counts and explanations
- [ ] Add caching to reduce API calls

### 6.3 Preview Text Generation (Claude)
- [ ] Create /api/ai/generate-preview-text endpoint
- [ ] Use subject line as context for generation
- [ ] Ensure 35-90 character limit
- [ ] Generate complementary preview text options
- [ ] Provide effectiveness explanations

### 6.4 AI Suggestion UI
- [ ] Add AI assist buttons with sparkle icons
- [ ] Create suggestion selection modal/popover
- [ ] Implement tone selector interface
- [ ] Display suggestions with explanations
- [ ] Add "Generate More" option
- [ ] Show optimization tips (character count, best practices)

## Phase 7: Polish & Testing (Week 7)

### 6.1 UI/UX Improvements
- [ ] Loading states for all operations
- [ ] Success/error toast notifications
- [ ] Confirm dialogs for destructive actions
- [ ] Help tooltips for complex features

### 6.2 Performance Optimization
- [ ] Optimize member list loading
- [ ] Cache church settings
- [ ] Lazy load Unlayer editor
- [ ] Implement proper pagination

### 6.3 Testing & Documentation
- [ ] Test with multiple churches
- [ ] Verify RLS policies work correctly
- [ ] Test edge cases (no members, bounces)
- [ ] Create user documentation

## Technical Architecture

### API Routes
```
/api/communication/campaigns - CRUD for campaigns
/api/communication/send - Send emails
/api/communication/test - Send test email
/api/communication/recipients - Manage recipients
/api/communication/settings - Church email settings
/api/webhooks/resend - Handle Resend webhooks
/api/public/unsubscribe - Public unsubscribe endpoint
/api/ai/generate-subject-lines - AI subject line generation
/api/ai/generate-preview-text - AI preview text generation
```

### Key Components
```
EmailEditor - Unlayer wrapper component
MemberSelector - Member selection UI
CampaignList - Campaign management table
QuotaIndicator - Monthly quota display
EmailPreview - Preview modal component
SchedulePicker - Date/time scheduler
```

### Services
```
EmailService - Resend API wrapper
QuotaService - Quota tracking
SchedulerService - Email scheduling
TemplateService - Template rendering
```

## Security Considerations
- Validate all user inputs
- Sanitize HTML content from Unlayer
- Verify church ownership for all operations
- Rate limit API endpoints
- Secure unsubscribe tokens
- Log all email sending activities

## Future Enhancements (V2)
- Advanced member segmentation
- Email templates library
- A/B testing capabilities
- Open/click tracking
- Custom domain support
- SMS integration
- Automated email sequences