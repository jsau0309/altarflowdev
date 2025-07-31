# Email Communication Database Schema

## New Tables

### 1. EmailCampaign
```prisma
model EmailCampaign {
  id                String              @id @default(cuid())
  churchId          String              @db.Uuid
  subject           String
  previewText       String?
  contentJson       Json                // Unlayer design JSON
  htmlContent       String?             // Generated HTML
  status            EmailStatus         @default(DRAFT)
  scheduledFor      DateTime?
  sentAt            DateTime?
  sentBy            String              // Clerk user ID
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  // Analytics
  totalRecipients   Int                 @default(0)
  sentCount         Int                 @default(0)
  deliveredCount    Int                 @default(0)
  bouncedCount      Int                 @default(0)
  unsubscribedCount Int                 @default(0)
  
  church            Church              @relation(fields: [churchId], references: [id], onDelete: Cascade)
  recipients        EmailRecipient[]
  
  @@index([churchId])
  @@index([churchId, createdAt])
  @@index([status])
  @@index([scheduledFor])
}

enum EmailStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
}
```

### 2. EmailRecipient
```prisma
model EmailRecipient {
  id              String           @id @default(cuid())
  campaignId      String
  memberId        String           @db.Uuid
  email           String
  status          RecipientStatus  @default(PENDING)
  sentAt          DateTime?
  deliveredAt     DateTime?
  bouncedAt       DateTime?
  bounceReason    String?
  unsubscribedAt  DateTime?
  resendEmailId   String?          // Resend tracking ID
  
  campaign        EmailCampaign    @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  member          Member           @relation(fields: [memberId], references: [id])
  
  @@unique([campaignId, memberId])
  @@index([campaignId])
  @@index([memberId])
  @@index([email])
}

enum RecipientStatus {
  PENDING
  SENT
  DELIVERED
  BOUNCED
  UNSUBSCRIBED
  FAILED
}
```

### 3. EmailPreference
```prisma
model EmailPreference {
  id                String    @id @default(cuid())
  memberId          String    @db.Uuid @unique
  email             String
  isSubscribed      Boolean   @default(true)
  unsubscribedAt    DateTime?
  unsubscribeToken  String    @unique @default(cuid())
  bounceCount       Int       @default(0)
  lastBouncedAt     DateTime?
  isEmailValid      Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  member            Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  
  @@index([email])
  @@index([unsubscribeToken])
}
```

### 4. EmailQuota
```prisma
model EmailQuota {
  id              String    @id @default(cuid())
  churchId        String    @db.Uuid @unique
  monthYear       String    // Format: "2025-01"
  emailsSent      Int       @default(0)
  quotaLimit      Int       @default(4)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  church          Church    @relation(fields: [churchId], references: [id], onDelete: Cascade)
  
  @@unique([churchId, monthYear])
  @@index([churchId])
}
```

### 5. EmailSettings
```prisma
model EmailSettings {
  id              String    @id @default(cuid())
  churchId        String    @db.Uuid @unique
  logoUrl         String?
  primaryColor    String    @default("#000000")
  timezone        String    @default("America/New_York")
  footerAddress   String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  church          Church    @relation(fields: [churchId], references: [id], onDelete: Cascade)
}
```

## Updates to Existing Models

### Member Model Addition
```prisma
model Member {
  // ... existing fields ...
  
  emailRecipients  EmailRecipient[]
  emailPreference  EmailPreference?
}
```

### Church Model Addition
```prisma
model Church {
  // ... existing fields ...
  
  emailCampaigns  EmailCampaign[]
  emailQuota      EmailQuota?
  emailSettings   EmailSettings?
}
```

## RLS Policies

### EmailCampaign
- Users can only view/edit campaigns for their church
- Only ADMIN and STAFF roles can create/edit campaigns

### EmailRecipient
- Users can only view recipients for their church's campaigns
- Recipients linked through campaign ownership

### EmailPreference
- Members can view/update their own preferences via unsubscribe token
- Church staff can view preferences for their members

### EmailQuota
- Only viewable by church's authorized users
- System automatically updates quota usage

### EmailSettings
- Only ADMIN role can update settings
- STAFF can view settings