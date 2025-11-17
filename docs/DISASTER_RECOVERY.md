# Disaster Recovery Runbook

This runbook describes how to recover AltarFlow production data from the automated backups that are uploaded to the `altarflow-backups` S3 bucket. Review it quarterly and complete the monthly test restore drill to ensure the workflow remains healthy.

> **Operational Discipline:** Put two recurring calendar events on the platform calendar—(1) a **monthly restore drill** (full backup download + restore into a throwaway Supabase project) and (2) a **quarterly runbook review / manual workflow dispatch**—so these checks never get skipped.

## AWS S3 Hardening Checklist

1. **Bucket encryption:** Enable SSE-S3 default encryption on `altarflow-backups` (S3 console → Bucket → Properties → Default encryption → "Server-side encryption with Amazon S3 managed keys (SSE-S3)"). This ensures every uploaded dump is encrypted at rest without extra CLI flags.
2. **Least-privilege access:** Lock the bucket so only the dedicated IAM user (`altarflow-backup-user`) can write objects under `altarflow-backups/*`. Attach a bucket policy similar to:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBackupUserWrite",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<account-id>:user/altarflow-backup-user" },
      "Action": ["s3:PutObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::altarflow-backups/*"
    },
    {
      "Sid": "AllowBackupUserReadPointers",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<account-id>:user/altarflow-backup-user" },
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::altarflow-backups",
        "arn:aws:s3:::altarflow-backups/database/*"
      ]
    }
  ]
}
```

3. **Public access block:** Leave "Block all public access" enabled to prevent accidental exposure.
4. **Logging:** (Optional) Enable S3 server access logs pointing to a separate log bucket for auditing restore attempts.

## Incident Response Contacts

| Role | Name/Email | Responsibilities |
| --- | --- | --- |
| Incident Commander | engineering@altarflow.com | Coordinates response, status updates |
| Database Engineer | db@altarflow.com | Restores data, verifies integrity |
| Product Lead | product@altarflow.com | Approves customer communications |

Escalate via Slack `#incidents` and phone tree if any on-call responder is unreachable within 15 minutes.

## Recovery Checklist

1. **Assess Scope**
   - Identify trigger (accidental deletion, compromised Supabase account, migration failure, etc.).
   - Estimate blast radius and current outage impact.
   - Determine data-loss window by comparing failure time to latest successful backup listed in `LATEST.txt`.
2. **Stabilize**
   - Disable production deploys.
   - Notify leadership and post status page update if user data is affected.
3. **Prepare Replacement Infrastructure**
   - Create a fresh Supabase project using the latest production schema.
   - Add the `DIRECT_URL` connection string to a secure note for the team.
4. **Restore Database**
   - Download the desired backup from S3 (see commands below).
   - Use `pg_restore`/`psql` to import into the new Supabase instance.
   - Record exact commands and timestamps in the incident doc.
5. **Validate**
   - Run smoke tests: log in, view dashboard, run donation report, confirm sample records for `Church` and `DonationTransaction` tables.
   - Check Prisma migrations table for completeness.
6. **Cut Over**
   - Update Vercel environment variables (`DIRECT_URL`, `DATABASE_URL`) to point at the restored database.
   - Trigger a production redeploy and verify health checks.
7. **Post-Recovery**
   - Reconcile data that may have been lost between failure time and backup timestamp.
   - Document incident timeline, root cause, and follow-up tasks.
   - Schedule an RCA review within 48 hours.

## Backup Locations & Structure

- Bucket: `altarflow-backups`
- Region: `us-east-1`
- Key pattern: `database/YYYY/MM/<timestamp>.sql.gz`
- Pointer file: `database/LATEST.txt` (line 1 timestamp, line 2 S3 URI, line 3 SHA-256 checksum)
- Checksum file: `database/LATEST.sha256` (same checksum in `sha256sum` format for quick validation)
- Cadence: Hourly (top of every hour, UTC)
- Retention: 30 days (720 backups total)

## Manual Backup Commands

From any secure workstation with the required credentials:

```bash
export DIRECT_URL="postgresql://<user>:<password>@<host>:5432/postgres"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
pg_dump --no-owner --no-privileges "$DIRECT_URL" | gzip > "${TIMESTAMP}.sql.gz"
aws s3 cp "${TIMESTAMP}.sql.gz" "s3://altarflow-backups/database/manual/${TIMESTAMP}.sql.gz"
```

## Restoring From Backup

```bash
# 1. Download backup + checksum
aws s3 cp "s3://altarflow-backups/database/YYYY/MM/<timestamp>.sql.gz" backup.sql.gz
aws s3 cp "s3://altarflow-backups/database/LATEST.sha256" LATEST.sha256

# 2. Verify integrity BEFORE decompressing
grep "<timestamp>" LATEST.sha256 > backup.sha256
sha256sum -c backup.sha256  # should report "OK"

gunzip backup.sql.gz

# 3. Restore into target database (DEST_URL should be the Supabase DIRECT_URL for the new project)
export DEST_URL="postgresql://<user>:<password>@<host>:5432/postgres"
psql "$DEST_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
psql "$DEST_URL" < backup.sql
```

> **Tip:** For large databases, prefer `pg_restore --clean --no-owner --no-privileges` with a custom-format dump created via `pg_dump -Fc`.

## Testing Schedule

| Task | Frequency | Owner |
| --- | --- | --- |
| Manual workflow dispatch test | Quarterly (calendar invite on first business Monday) | Platform Engineer |
| Full restore into test Supabase project (download, checksum verification, restore) | Monthly (calendar invite on first business day) | Database Engineer |
| Verify S3 retention cleanup | Monthly | DevOps |
| Review runbook accuracy | Quarterly | Incident Commander |

Log every test in the shared `Backups` Notion page, including date, operator, and verification notes.

## Failure Scenarios & Mitigations

| Scenario | Mitigation |
| --- | --- |
| Supabase account compromise | Use S3 copy of backups stored outside Supabase. Rotate credentials immediately. |
| Corrupted backup file | Use previous backup (max additional 1 hour data loss). Perform integrity check with `pg_restore --list`. |
| Workflow failure | GitHub Action automatically opens an issue; respond within SLA and run manual backup. |
| AWS credential leak | Rotate IAM user keys, purge compromised keys from GitHub secrets, and audit S3 access logs. |

## Post-Recovery Communication Template

```
Subject: [Resolved] AltarFlow data restoration completed

Summary: On <date>, our production database was restored from backups after <root cause>. Data loss window: <minutes>. All services are now operational.

Actions Taken:
- Created new Supabase project
- Restored <timestamp> backup from S3
- Reconfigured environment variables and redeployed
- Verified donation flow, reporting, and member search

Next Steps:
- <List follow-up tasks>

Thank you for your patience.
```

Keep this template updated with relevant communication channels (Statuspage, email list, in-app banners) as they evolve.
