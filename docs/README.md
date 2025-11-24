# AltarFlow Documentation

This folder contains all project documentation organized by category.

## Structure

### `/bugfixes`
Bug fixes and troubleshooting documentation:
- **`/database-retry`** - Database retry mechanism fixes (Prisma client extensions)
- **`/rate-limit-cache`** - Rate limit cache timing fixes
- Individual bug fix documentation

### `/completed`
Completed feature implementations and integrations:
- Database connection improvements
- Gemini receipt OCR migration
- PostHog analytics integration
- Sentry error tracking integration
- Pino logging migration

### `/database`
Database-related documentation:
- **`/prisma`** - Prisma schema management, drift prevention, production workflows
- Drizzle migration planning (future consideration)
- RLS policies reference

### `/future`
Future features, plans, and roadmap items:
- Feature concepts and enhancement proposals
- Long-term roadmap items
- Technical debt items
- **`/Saint`** - AI agent PRD documents

### `/guides`
Implementation guides and setup documentation:
- AI agent implementation guide
- Pricing model setup
- Landing page improvements

### `/infrastructure`
Infrastructure and monitoring documentation:
- Cache and monitoring summaries
- Testing guides

### `/operations`
Operational documentation:
- Disaster recovery procedures
- Post-merge deployment checklists
- Linear issue workflow

### `/plan`
Implementation plans for major features:
- Newsletter builder removal plan

### `/scale`
Scaling and infrastructure optimization:
- Supabase Pro scaling guide
- Connection pool configuration
- Performance benchmarks

### `/security`
Security audits and documentation:
- Client identifier security audit

### `/sentry`
Sentry error tracking documentation:
- Configuration guides
- Dashboard setup
- Monitoring procedures

### `/versions`
Version-specific documentation:
- **`/v1`** - Deployment checklists, release notes, UI improvements

## Quick Links

- [Disaster Recovery](./operations/DISASTER_RECOVERY.md)
- [Post-Merge Checklist](./operations/POST_MERGE_DEPLOYMENT_CHECKLIST.md)
- [Prisma Schema Drift Prevention](./database/prisma/PREVENT_SCHEMA_DRIFT.md)
- [Scaling Guide](./scale/SUPABASE_PRO_SCALING_GUIDE.md)
- [Sentry Configuration](./sentry/SENTRY_CONFIGURATION_GUIDE.md)

## Documentation Standards

1. **Bug Fixes**: Place in `/bugfixes`, group related fixes in subfolders
2. **Completed Work**: Move to `/completed` when feature is deployed
3. **Future Plans**: Keep in `/future` until implementation starts
4. **Operations**: Checklists and workflows in `/operations`
5. **Security**: All security-related docs in `/security`

Last Updated: November 2025
