# Church Language Preference and Branding Implementation Plan

## Overview
This document outlines the implementation plan for adding church-level language preferences and branding capabilities to AltarFlow. This will ensure that internal communications (like prayer request notifications) use the church's preferred language, while visitor-facing emails use the visitor's language choice.

## Current State
- All emails use the language selected by the form submitter
- Prayer request notifications go to church staff but use the visitor's language
- No church-level language preference storage
- All emails use the default Altarflow logo

## Phase 1: Church Language Preference

### 1.1 Database Schema Update
```prisma
model Church {
  // ... existing fields ...
  preferredLanguage String @default("en") // "en" or "es"
  // ... other fields ...
}
```

### 1.2 Migration Steps
1. Add `preferredLanguage` field to Church model with default "en"
2. Run Prisma migration: `npx prisma migrate dev --name add-church-language-preference`
3. Generate Prisma client: `npx prisma generate`

### 1.3 Settings Page Update
- Modify `/components/settings/general-settings.tsx`:
  - Add language preference to church profile section
  - Save language preference to church record when admin changes platform language
  - Sync platform language with church language preference

### 1.4 Email Logic Update
- Update `/lib/actions/flows.actions.ts`:
  ```typescript
  // In sendPrayerRequestEmail call:
  sendPrayerRequestEmail(
    prayerNotificationEmail,
    submitterName,
    submitterEmail,
    submitterPhone,
    prayerRequestText,
    flow.church.name,
    flow.church.preferredLanguage || 'en', // Use church's language
    churchLogoUrl
  )
  ```

### 1.5 API Endpoint Updates
- Update `/api/settings/church-profile/route.ts`:
  - Include `preferredLanguage` in GET response
  - Accept `preferredLanguage` in PUT request
  - Validate language values ("en" or "es")

## Phase 2: Church Branding (Future Enhancement)

### 2.1 Database Schema for Logo
```prisma
model Church {
  // ... existing fields ...
  logoUrl          String?
  logoPublicId     String? // For Supabase/Cloudinary storage reference
  // ... other fields ...
}
```

### 2.2 Logo Upload Implementation
1. **Storage Setup**:
   - Create Supabase storage bucket: `church-logos`
   - Set up public access policies
   - Configure size limits (max 5MB)
   - Allow only image formats (PNG, JPG, SVG)

2. **Upload Component**:
   - Add image upload to church profile settings
   - Show preview of current logo
   - Validate file type and size client-side
   - Compress images if needed

3. **API Implementation**:
   - Create `/api/settings/church-logo/route.ts`
   - Handle file upload to Supabase storage
   - Update church record with logo URL
   - Clean up old logos when replaced

### 2.3 Email Template Updates
- Update all email templates to use `church.logoUrl` when available
- Fall back to Altarflow logo if none set
- Ensure logos are properly sized in emails

## Phase 3: Extended Branding Options

### 3.1 Additional Branding Fields
```prisma
model Church {
  // ... existing fields ...
  primaryColor     String @default("#5a67d8") // Hex color
  secondaryColor   String @default("#e74c3c") // Hex color
  // ... other fields ...
}
```

### 3.2 Use Cases
1. **Email Templates**: Use church colors for accents
2. **Landing Pages**: Apply church branding to public pages
3. **Donation Forms**: Match church visual identity
4. **PDF Reports**: Include church branding

## Implementation Priority

### Immediate (Phase 1 Only)
1. Add `preferredLanguage` field to database
2. Update church profile API and UI
3. Fix prayer request email language logic
4. Default to English for prayer requests until implemented

### Version 2.0 (Phase 2 & 3)
1. Logo upload functionality
2. Storage integration
3. Update all email templates
4. Extended branding options

## Technical Considerations

### Language Detection Logic
```typescript
// Proposed helper function
function getEmailLanguage(emailType: 'visitor' | 'internal', visitorLang?: string, churchLang?: string): 'en' | 'es' {
  if (emailType === 'visitor') {
    return visitorLang || 'en';
  } else {
    return churchLang || 'en';
  }
}
```

### Storage Considerations
- Use Supabase Storage for logo files
- Implement CDN caching for better performance
- Set up automatic image optimization
- Consider backup storage solution

### Migration Strategy
1. Deploy database changes first
2. Update API endpoints
3. Roll out UI changes
4. Migrate existing churches (set default language based on current usage)

## Estimated Timeline

### Phase 1 (Language Preference)
- Database migration: 30 minutes
- API updates: 1 hour
- Settings UI: 1 hour
- Email logic updates: 30 minutes
- Testing: 1 hour
**Total: ~4 hours**

### Phase 2 (Logo Upload)
- Storage setup: 1 hour
- Upload component: 2 hours
- API implementation: 2 hours
- Email template updates: 1 hour
- Testing: 2 hours
**Total: ~8 hours**

### Phase 3 (Extended Branding)
- Database updates: 30 minutes
- Color picker UI: 2 hours
- Template integration: 3 hours
- Testing: 2 hours
**Total: ~7.5 hours**

## Notes
- For now, prayer request emails will default to English
- Consider adding email preview functionality in settings
- May want to add "Test Email" feature for admins
- Future: Support more languages beyond English/Spanish