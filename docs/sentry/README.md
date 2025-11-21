# Sentry Monitoring Documentation

Comprehensive guides for production monitoring and observability in AltarFlow.

---

## 📚 Documentation Index

### 1. [PRODUCTION_MONITORING_GUIDE.md](./PRODUCTION_MONITORING_GUIDE.md)
**Complete production monitoring implementation guide**

**What's Inside:**
- ✅ Sentry Cron Job Monitoring (automated health checks)
- ✅ Slack Critical Error Notifications (payment failures, slow queries, app-breaking issues)
- ✅ Performance Monitoring (API routes, database queries, external calls)
- ✅ Business Metrics Tracking (donations, members, expenses, AI usage)
- ✅ Troubleshooting guides for all features

**When to Use:**
- Setting up monitoring for the first time
- Understanding how the monitoring system works
- Troubleshooting monitoring issues
- Learning about what gets tracked automatically

---

### 2. [DASHBOARDS_AND_MONITORING_SETUP.md](./DASHBOARDS_AND_MONITORING_SETUP.md)
**Step-by-step guide for dashboards and uptime monitoring**

**What's Inside:**
- ✅ Health Check Endpoints (`/api/health`, `/api/health/metrics`)
- ✅ Uptime Monitoring Options (Vercel Analytics, Better Uptime, UptimeRobot, Sentry Uptime)
- ✅ Sentry Dashboard Creation (Business Health, System Health, User Experience)
- ✅ Widget configurations with specific queries
- ✅ Testing procedures and cost comparisons

**When to Use:**
- Setting up uptime monitoring
- Creating custom Sentry dashboards
- Testing health check endpoints
- Comparing uptime monitoring services

---

## 🚀 Quick Start

### Essential Setup (Minimum Viable Monitoring)

1. **Health Endpoints** ✅ Already created
   - Test: `curl http://localhost:3000/api/health`
   - Production: `curl https://altarflow.com/api/health`

2. **Slack Notifications** ⚙️ Configure webhook
   - Add `SLACK_WEBHOOK_URL` to Vercel environment variables
   - Test: `npx tsx scripts/test-slack-notification.ts`

3. **Uptime Monitoring** 📊 Choose one option
   - **Easiest**: Use Vercel Analytics (already active, no setup)
   - **Recommended**: Better Uptime (free tier, custom alerts)
   - **Alternative**: UptimeRobot (50 monitors free)

### Optional Enhancements

4. **Sentry Dashboards** 📈 (Optional but recommended)
   - Follow [DASHBOARDS_AND_MONITORING_SETUP.md](./DASHBOARDS_AND_MONITORING_SETUP.md)
   - Create 3 dashboards: Business Health, System Health, User Experience

---

## 🎯 What Gets Monitored

### Automatic Monitoring (Already Working)

✅ **Cron Jobs**
- check-expired-subscriptions (daily at 2 AM)
- cleanup-pending-donations (weekly on Sunday at 3 AM)

✅ **Critical Errors** (Auto-Slack Notifications)
- Payment failures
- Database connection errors
- Cron job failures
- Fatal errors

✅ **Performance** (Auto-logged to Sentry)
- Slow API routes (>1s warning, >3s critical)
- Slow database queries (>500ms warning, >2s critical)
- Slow external API calls (>2s warning, >5s critical)

✅ **Business Metrics** (Logged for analytics)
- Donations (completed, refunded, recurring)
- Members (created, updated, deleted)
- Expenses (created, approved, paid)
- Organizations (created, subscriptions)
- AI usage (reports, emails, OCR)

---

## 🔧 Key Files

### Implementation Files
- `/lib/sentry-cron.ts` - Cron job monitoring wrapper
- `/lib/slack-notifier.ts` - Slack notification templates
- `/lib/performance-monitor.ts` - Performance tracking utilities
- `/lib/metrics.ts` - Business metrics tracking
- `/lib/logger/index.ts` - Enhanced logger with Slack integration

### API Endpoints
- `/app/api/health/route.ts` - System health check
- `/app/api/health/metrics/route.ts` - Business metrics endpoint

### Test Scripts
- `/scripts/test-slack-notification.ts` - Test Slack integration with templates
- `/scripts/test-slack-simple.ts` - Simple webhook test

---

## 📊 Monitoring Stack

| Component | Tool | Status | Cost |
|-----------|------|--------|------|
| **Error Tracking** | Sentry | ✅ Active | Free (Developer plan) |
| **Logging** | Pino + Sentry | ✅ Active | Included |
| **Cron Monitoring** | Sentry Cron | ✅ Active | Included |
| **Alerts** | Slack Webhooks | ✅ Configured | Free |
| **Uptime** | Vercel Analytics | ✅ Active | Included |
| **Dashboards** | Sentry | ⚙️ Optional | Included |
| **Health Checks** | Custom Endpoints | ✅ Active | Included |

**Total Cost**: $0/month 🎉

---

## 🆘 Troubleshooting

### Slack Notifications Not Working?
1. Check `SLACK_WEBHOOK_URL` is set in Vercel environment variables
2. Test locally: `npx tsx scripts/test-slack-notification.ts`
3. Verify webhook URL format: `https://hooks.slack.com/services/...`
4. Check Slack app has permission to post to channel

### Health Endpoints Returning Errors?
1. Verify database connection: `DATABASE_URL` is set
2. Check required environment variables are present
3. Test locally: `curl http://localhost:3000/api/health`
4. Check Vercel logs for detailed error messages

### Cron Jobs Not Reporting?
1. Verify `CRON_SECRET` is set in Vercel
2. Check cron jobs are configured in `vercel.json`
3. View Sentry Cron Monitors dashboard for status
4. Test auth: `curl -H "Authorization: Bearer YOUR_SECRET" /api/cron/...`

---

## 🎓 Best Practices

1. **Always monitor in production first** - Don't optimize what you can't measure
2. **Set up alerts for critical paths** - Payment failures, database errors
3. **Review dashboards weekly** - Look for performance regressions
4. **Test health endpoints regularly** - Ensure uptime monitoring works
5. **Keep Slack alerts actionable** - Too many alerts = alert fatigue

---

## 🔗 Related Documentation

- [Structured Logging Guide](/docs/STRUCTURED_LOGGING_GUIDE.md)
- [Pino Logger Integration](/docs/PINO_LOGGING_INTEGRATION.md)
- [Disaster Recovery Plan](/docs/DISASTER_RECOVERY.md)
- [Performance Optimization](/docs/todo/DATABASE_INDEXING_PLAN.md)

---

## 📝 Linear Issues

**Completed:**
- ✅ ALT-87: Structured Logging Migration (All 5 phases complete)

**Future Enhancements:**
- 📋 ALT-115: Log Aggregation Service Integration (Better Stack, Datadog, CloudWatch)
- 📋 ALT-116: Automated Error Triaging with Linear (Auto-create issues from Sentry)
- 📋 ALT-117: Distributed Tracing (OpenTelemetry, Sentry Performance)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
