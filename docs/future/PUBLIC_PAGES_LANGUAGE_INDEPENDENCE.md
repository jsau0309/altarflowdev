# Public Pages Language Independence Plan

## Overview
Currently, all public-facing pages (donation page, member connect form, NFC landing page) share the same i18n instance with the main application. This means that when a visitor changes the language on any public page, it affects the church admin's language preference in the dashboard, and vice versa. This document outlines the plan to implement independent language handling for all public pages.

## Affected Public Pages
1. **Donation Page** (`/[churchSlug]`) - Where donors make contributions
2. **Connect Form** (`/connect/[churchSlug]`) - New member registration flow
3. **NFC Landing Page** (`/nfc/[churchSlug]`) - NFC tap-to-donate landing
4. **Future Public Pages** - Event registration, public calendars, etc.

## Problem Statement
1. **Shared State Issue**: All public pages use the same i18n instance as the main app
2. **Multi-user Conflict**: Multiple visitors may be using public pages simultaneously in different languages
3. **Admin Experience**: Church admins' language preference shouldn't be affected by public page interactions
4. **Cookie Collision**: Both public and admin sections use the same `NEXT_LOCALE` cookie
5. **Member Journey**: A Spanish-speaking visitor filling the connect form gets English after admin changes language

## Proposed Solution

### 1. Separate i18n Instances
Create separate i18n configurations for public and authenticated sections:

```typescript
// lib/i18n-public.ts
export const i18nPublic = createInstance({
  lng: 'en', // Default language
  fallbackLng: 'en',
  ns: ['donations', 'connect-form', 'nfc', 'common', 'public'],
  defaultNS: 'public',
  // Use different cookie/storage key
  detection: {
    order: ['querystring', 'cookie', 'navigator'],
    lookupQuerystring: 'lang',
    caches: ['cookie'],
    cookieName: 'NEXT_PUBLIC_LOCALE', // Different from admin
  }
});

// lib/i18n-admin.ts (existing)
export const i18nAdmin = createInstance({
  // ... existing config
  cookieName: 'NEXT_ADMIN_LOCALE', // Renamed from NEXT_LOCALE
});
```

### 2. Context-Based Providers
Implement separate providers for public and admin sections:

```typescript
// components/PublicI18nProvider.tsx
export function PublicI18nProvider({ children, initialLang }) {
  return (
    <I18nextProvider i18n={i18nPublic} defaultNS="public">
      {children}
    </I18nextProvider>
  );
}

// app/(public)/layout.tsx
export default function PublicLayout({ children }) {
  return (
    <PublicI18nProvider initialLang={detectLanguage()}>
      {children}
    </PublicI18nProvider>
  );
}
```

### 3. URL-Based Language Detection
Consider using URL parameters or subdomains for language selection on public pages:

```typescript
// Option A: URL Parameter (Recommended for MVP+)
// example.com/church-slug?lang=es                    // Donation page
// example.com/connect/church-slug?lang=es            // Connect form
// example.com/nfc/church-slug?lang=es                // NFC landing

// Option B: Path-based
// example.com/es/church-slug                         // Donation page
// example.com/es/connect/church-slug                 // Connect form
// example.com/es/nfc/church-slug                     // NFC landing

// Option C: Subdomain (requires DNS configuration)
// es.example.com/church-slug                         // Donation page
// es.example.com/connect/church-slug                 // Connect form
```

### 4. Language Toggle for Public Pages
Create a dedicated language toggle that only affects the public context:

```typescript
// components/PublicLanguageToggle.tsx
export function PublicLanguageToggle() {
  const { i18n } = useTranslation(); // Uses public i18n instance
  
  const changeLanguage = (lng: string) => {
    // Only sets public cookie
    setCookie('NEXT_PUBLIC_LOCALE', lng, 365);
    i18n.changeLanguage(lng);
    // Optionally update URL parameter
    router.push(`${pathname}?lang=${lng}`);
  };
  
  return (
    // Toggle UI
  );
}
```

### 5. Church Language Preference
Allow churches to set a default language for their public pages:

```prisma
model Church {
  // ... existing fields
  publicPageLanguage String @default("en") // Default language for public pages
  connectFormLanguage String? // Optional override for connect form
  nfcPageLanguage String? // Optional override for NFC page
}
```

This allows churches to:
- Set a global default for all public pages
- Override language for specific pages (e.g., Spanish church wants English connect form for visitors)

### 6. Auto-Detection Priority
Implement smart language detection for public pages:

1. URL parameter (if present) - `?lang=es`
2. Page-specific language override (if set)
3. Church's default language preference
4. Visitor's previous selection (cookie)
5. Visitor's browser language
6. System default (English)

Special considerations:
- **NFC Page**: Should remember last language used on device
- **Connect Form**: Should persist language through entire multi-step flow
- **Donation Page**: Should maintain language through payment process

## Implementation Steps

### Phase 1: Infrastructure (Week 1)
- [ ] Create separate i18n configuration files
- [ ] Implement PublicI18nProvider component
- [ ] Update public layout to use new provider
- [ ] Create migration for church language preference field

### Phase 2: Language Detection (Week 2)
- [ ] Implement URL parameter detection
- [ ] Add church default language support
- [ ] Create PublicLanguageToggle component
- [ ] Update donation page to use new toggle
- [ ] Update connect form to use new toggle
- [ ] Update NFC page to use new toggle
- [ ] Ensure language persistence through multi-step flows

### Phase 3: Testing & Refinement (Week 3)
- [ ] Test multi-user scenarios
- [ ] Verify cookie isolation
- [ ] Test language persistence
- [ ] Performance optimization

### Phase 4: Extended Features (Future)
- [ ] Add language preference to donor profiles
- [ ] Add language preference to member profiles
- [ ] Implement email language preferences (receipts, confirmations)
- [ ] SMS language preferences for OTP messages
- [ ] Add more languages beyond English/Spanish
- [ ] Analytics for language usage per page type
- [ ] QR code generation with embedded language parameter
- [ ] NFC tag programming with language preference

## Benefits
1. **Improved User Experience**: Visitors can use their preferred language without affecting others
2. **Admin Consistency**: Church admins maintain their language preference
3. **Member Journey**: Consistent language throughout connect form completion
4. **NFC Experience**: Quick language selection for tap-to-donate scenarios
5. **Scalability**: Ready for multi-church, multi-language scenarios
6. **SEO Benefits**: Language-specific URLs for better search indexing
7. **Accessibility**: Better support for multilingual congregations

## Considerations
1. **Bundle Size**: Separate i18n instances may increase bundle size
2. **Caching**: Need to handle CDN caching for different language versions
3. **Email Templates**: Ensure emails match the page language:
   - Donation receipts in donation language
   - Connect form confirmations in form language
   - NFC donation confirmations in selected language
4. **Analytics**: Track language preferences for insights
5. **Data Privacy**: Language preference storage must comply with privacy laws
6. **Flow Continuity**: Language must persist through:
   - Multi-step connect forms
   - Payment processing redirects
   - Email verification flows

## Alternative Approaches Considered
1. **Session Storage**: Too temporary, doesn't persist across visits
2. **Database Storage**: Requires user identification, not suitable for anonymous donors
3. **Single Instance with Namespaces**: Still shares core state, doesn't fully solve the problem

## Estimated Timeline
- **MVP Implementation**: 3 weeks
- **Full Feature Set**: 6 weeks
- **Testing & Optimization**: 2 weeks

## Dependencies
- Next.js 15 routing capabilities
- i18next library updates
- Cookie management strategy
- CDN configuration for language-based caching

## Success Metrics
1. Zero language preference conflicts between admin and public sections
2. Language preference persistence for returning visitors
3. Reduced support tickets related to language issues
4. Improved conversion rates:
   - Higher donation completion rate for Spanish-speaking users
   - Higher connect form completion rate
   - Increased NFC tap-to-donate usage
5. Consistent language experience across entire visitor journey
6. Measurable increase in Spanish-language engagement

## Page-Specific Requirements

### Donation Page
- Language should persist through payment flow
- Stripe Checkout should use matching locale
- Receipt emails in donation language
- Thank you page in same language

### Connect Form (Member Registration)
- Language persistence through multi-step flow
- Field validation messages in selected language
- Welcome email in registration language
- Save language preference to member profile

### NFC Landing Page
- Quick language detection (NFC taps are fast interactions)
- Remember last language on device (cookie)
- Minimal UI for language switching
- Pass language to donation flow

## Notes
- This implementation should be done after the MVP launch
- Consider A/B testing different language detection strategies
- Monitor performance impact of separate i18n instances
- Plan for future addition of more languages (Portuguese, French, etc.)
- Consider creating language-specific NFC tags/QR codes with embedded language params
- Test with real bilingual churches for feedback