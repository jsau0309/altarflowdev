# AltarFlow Version Documentation

This folder contains version-specific documentation for different releases of AltarFlow.

## Version History

### 📦 v1.0 (Current - August 2025)
**Status**: Production Ready

**Major Features**:
- Complete church management system
- Multi-tenant architecture with Clerk
- Stripe Connect for donations
- Email communication system with Topol editor
- Member management with CSV import
- Financial tracking (donations & expenses)
- AI-powered report summaries
- Multi-language support (EN/ES)

**Key Improvements**:
- Security hardening (XSS, IDOR, rate limiting)
- Database connection pool optimization
- Production-ready email campaigns
- Comprehensive webhook handling

[View v1 Documentation](./v1/)

## Version Structure

Each version folder contains:
- `DEPLOYMENT_CHECKLIST_V{X}.md` - Version-specific deployment guide
- `RELEASE_NOTES_V{X}.md` - What's new in this version
- `MIGRATION_GUIDE_V{X}.md` - How to upgrade from previous version

## Versioning Strategy

We follow semantic versioning:
- **Major (X.0.0)**: Breaking changes, major features
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, security patches

Last Updated: August 1, 2025