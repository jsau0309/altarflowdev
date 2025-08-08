# Row Level Security (RLS) Policies for AltarFlow

## Overview
This document outlines the Row Level Security policies that should be implemented in Supabase to ensure proper data isolation between churches.

## Implementation Status
- [ ] Church table
- [ ] Member table  
- [ ] DonationTransaction table
- [ ] Donor table
- [ ] Campaign table
- [ ] Expense table
- [ ] EmailCampaign table
- [ ] PayoutSummary table
- [ ] Flow table
- [ ] Submission table

## Policy Templates

### 1. Church Table
```sql
-- Enable RLS
ALTER TABLE "Church" ENABLE ROW LEVEL SECURITY;

-- Churches can only be viewed by members of that organization
CREATE POLICY "Churches are viewable by organization members" ON "Church"
  FOR SELECT USING (
    "clerkOrgId" = current_setting('app.current_org_id', true)
  );

-- Churches can only be updated by organization admins
CREATE POLICY "Churches are updatable by organization admins" ON "Church"
  FOR UPDATE USING (
    "clerkOrgId" = current_setting('app.current_org_id', true)
    AND current_setting('app.current_user_role', true) = 'ADMIN'
  );
```

### 2. Member Table
```sql
-- Enable RLS
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;

-- Members can only be viewed by their church organization
CREATE POLICY "Members are viewable by church members" ON "Member"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Church" 
      WHERE "Church"."id" = "Member"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
    )
  );

-- Members can be created by church admins
CREATE POLICY "Members can be created by church admins" ON "Member"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "Member"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
      AND current_setting('app.current_user_role', true) IN ('ADMIN', 'STAFF')
    )
  );

-- Members can be updated by church admins/staff
CREATE POLICY "Members can be updated by church admins/staff" ON "Member"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "Member"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
      AND current_setting('app.current_user_role', true) IN ('ADMIN', 'STAFF')
    )
  );

-- Members can be deleted by church admins only
CREATE POLICY "Members can be deleted by church admins" ON "Member"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "Member"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
      AND current_setting('app.current_user_role', true) = 'ADMIN'
    )
  );
```

### 3. DonationTransaction Table
```sql
-- Enable RLS
ALTER TABLE "DonationTransaction" ENABLE ROW LEVEL SECURITY;

-- Donations can only be viewed by their church
CREATE POLICY "Donations are viewable by church members" ON "DonationTransaction"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "DonationTransaction"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
    )
  );

-- Donations can be created by authenticated users (for their church)
CREATE POLICY "Donations can be created for church" ON "DonationTransaction"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "DonationTransaction"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
    )
  );

-- Donations can only be updated by church admins
CREATE POLICY "Donations can be updated by church admins" ON "DonationTransaction"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "DonationTransaction"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
      AND current_setting('app.current_user_role', true) = 'ADMIN'
    )
  );
```

### 4. Expense Table
```sql
-- Enable RLS
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;

-- Expenses can be viewed by church members
CREATE POLICY "Expenses are viewable by church members" ON "Expense"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "Expense"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
    )
  );

-- Expenses can be created by church members
CREATE POLICY "Expenses can be created by church members" ON "Expense"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "Expense"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
    )
    AND "submitterId" = current_setting('app.current_user_id', true)
  );

-- Expenses can be updated by submitter (if pending) or admins
CREATE POLICY "Expenses can be updated by submitter or admins" ON "Expense"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "Expense"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
    )
    AND (
      ("submitterId" = current_setting('app.current_user_id', true) AND "status" = 'PENDING')
      OR current_setting('app.current_user_role', true) = 'ADMIN'
    )
  );

-- Expenses can be deleted by admins only
CREATE POLICY "Expenses can be deleted by admins" ON "Expense"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "Expense"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
      AND current_setting('app.current_user_role', true) = 'ADMIN'
    )
  );
```

### 5. PayoutSummary Table
```sql
-- Enable RLS
ALTER TABLE "PayoutSummary" ENABLE ROW LEVEL SECURITY;

-- Payouts can only be viewed by their church
CREATE POLICY "Payouts are viewable by church members" ON "PayoutSummary"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Church"
      WHERE "Church"."id" = "PayoutSummary"."churchId"
      AND "Church"."clerkOrgId" = current_setting('app.current_org_id', true)
    )
  );

-- Payouts can only be created by system (webhooks)
-- No INSERT policy for users

-- Payouts can only be updated by system (webhooks/reconciliation)
-- No UPDATE policy for users
```

## Setting Session Variables

To make RLS work, you need to set session variables before each query:

```javascript
// In your API middleware or database connection setup:
async function setRLSContext(orgId: string, userId: string, userRole: string) {
  await prisma.$executeRaw`
    SET LOCAL app.current_org_id = ${orgId};
    SET LOCAL app.current_user_id = ${userId};
    SET LOCAL app.current_user_role = ${userRole};
  `;
}

// Use in API routes:
export async function GET(request: Request) {
  const { userId, orgId, orgRole } = await auth();
  
  // Set RLS context
  await setRLSContext(orgId, userId, orgRole);
  
  // Now queries will be filtered by RLS
  const members = await prisma.member.findMany();
  // Will only return members from the user's church
}
```

## Testing RLS Policies

```sql
-- Test as different users/orgs
SET LOCAL app.current_org_id = 'org_123';
SET LOCAL app.current_user_id = 'user_456';
SET LOCAL app.current_user_role = 'ADMIN';

-- Should only see data for org_123
SELECT * FROM "Member";

-- Switch context
SET LOCAL app.current_org_id = 'org_789';
-- Should now see different data
SELECT * FROM "Member";
```

## Important Notes

1. **Enable RLS on all tables** containing church-specific data
2. **Always set session variables** before database queries
3. **Test policies thoroughly** with different user roles and organizations
4. **Use EXISTS subqueries** for better performance with joins
5. **Webhook operations** should bypass RLS (use service role key)
6. **Monitor performance** - RLS adds overhead to queries

## Migration Strategy

1. Create policies in test environment first
2. Test with multiple churches/users
3. Deploy to production during low-traffic period
4. Monitor for any access issues
5. Have rollback plan ready

## Security Considerations

- RLS is an additional layer, not a replacement for API-level authorization
- Always validate at both API and database levels
- Log policy violations for security monitoring
- Regular audit of data access patterns
- Keep policies simple and maintainable