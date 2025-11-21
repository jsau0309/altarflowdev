# Dashboards and Monitoring Setup Guide

Complete guide to setting up Sentry dashboards and uptime monitoring for AltarFlow.

---

## Table of Contents

1. [Health Check Endpoints](#health-check-endpoints)
2. [Uptime Monitoring](#uptime-monitoring)
3. [Sentry Dashboards](#sentry-dashboards)
4. [Testing](#testing)

---

## Health Check Endpoints

### ✅ Endpoints Created

Two health check endpoints are now available:

#### 1. **`GET /api/health`** - System Health Check

**Purpose**: Quick health check for uptime monitors

**Response** (when healthy):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-21T02:00:00.000Z",
  "uptime": 12345,
  "checks": {
    "database": {
      "status": "ok",
      "duration": 12
    },
    "environment": {
      "status": "ok"
    }
  },
  "responseTime": 15
}
```

**Response** (when unhealthy):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-21T02:00:00.000Z",
  "uptime": 12345,
  "checks": {
    "database": {
      "status": "error",
      "message": "Connection timeout"
    },
    "environment": {
      "status": "ok"
    }
  },
  "responseTime": 5001
}
```

**HTTP Status Codes**:
- `200 OK` - All checks passed
- `503 Service Unavailable` - One or more checks failed

---

#### 2. **`GET /api/health/metrics`** - Business Metrics

**Purpose**: Business health metrics for custom dashboards

**Response**:
```json
{
  "timestamp": "2025-11-21T02:11:20.950Z",
  "period": "24h",
  "metrics": {
    "donations": {
      "total": 3,
      "successful": 3,
      "successRate": "100.00%",
      "totalAmount": 43300,
      "byStatus": [
        { "status": "succeeded", "count": 3, "amount": 43300 }
      ]
    },
    "expenses": {
      "newExpenses": 0
    },
    "members": {
      "newMembers": 0
    },
    "system": {
      "nodeVersion": "v20.19.3",
      "uptime": 192.921114,
      "memory": {
        "used": 595,
        "total": 643,
        "unit": "MB"
      }
    }
  }
}
```

---

## Uptime Monitoring

### Option 1: Vercel Analytics (Built-in, Free)

**Already configured!** Vercel automatically monitors your deployment.

**Access:**
1. Go to your Vercel project dashboard
2. Click "Analytics" tab
3. View uptime, response times, and error rates

**Features:**
- ✅ Automatic uptime monitoring
- ✅ Response time tracking
- ✅ Error rate tracking
- ✅ Real User Monitoring (RUM)
- ✅ No configuration needed

---

### Option 2: Better Stack (Recommended for Custom Alerts + Status Page)

**Free tier**: 10 monitors, 3-minute checks, status page included

**⚠️ IMPORTANT: Set up AFTER deploying health endpoints to production!**

**Setup:**

1. **Sign up**: https://betterstack.com/

2. **Select Features** (Onboarding):
   - ✅ **Uptime monitoring** (monitors your health endpoints)
   - ✅ **Status page** (public status page for users)
   - ✅ **On-call & Incident management** (team coordination)
   - ⏭️ Skip: Log management, Error tracking, Infrastructure monitoring (you have Sentry)

3. **Create Primary Monitor**:
   - **Name**: AltarFlow Production Health
   - **URL**: `https://altarflow.com/api/health`
   - **Method**: GET
   - **Check Frequency**: 3 minutes (or 1 minute on paid plan)
   - **Expected Status Code**: 200
   - **Keyword Check**: `healthy` (validates response contains this word)
   - **Timeout**: 30 seconds

4. **Create Additional Monitors** (Recommended):

   **Monitor 2: API Metrics**
   - **Name**: AltarFlow Metrics API
   - **URL**: `https://altarflow.com/api/health/metrics`
   - **Check Frequency**: 5 minutes
   - **Expected Status Code**: 200

   **Monitor 3: Donation Processing**
   - **Name**: AltarFlow Donations API
   - **URL**: `https://altarflow.com/api/donations/initiate`
   - **Method**: POST (with test payload)
   - **Check Frequency**: 10 minutes
   - **Expected Status Code**: 200 or 401 (authentication required is OK)
   - **Purpose**: Ensures payment processing endpoint is responding

   **Monitor 4: Authentication Service**
   - **Name**: Clerk Authentication
   - **URL**: `https://altarflow.com/api/auth/session`
   - **Check Frequency**: 5 minutes
   - **Expected Status Code**: 200 or 401
   - **Purpose**: Ensures Clerk authentication is working

   **Monitor 5: Database Connection**
   - **Name**: Database Health
   - **URL**: `https://altarflow.com/api/health` (already monitors DB)
   - **Alert on**: `"database": { "status": "error" }` in response
   - **Purpose**: Specific alerting for database issues

5. **Configure Alert Channels**:

   **Slack Integration** ✅ (Already configured):
   - Click **Integrations** → **Slack**
   - Connect to your workspace
   - Select channel: **#monitoring** (same as Sentry notifications)
   - Alert settings:
     - ✅ Alert on downtime
     - ✅ Alert on recovery
     - ✅ Alert on slow response (>2s)

   **Email Alerts**:
   - Add team email: hola@altarflow.com
   - Alert after: 2 failed checks (6 minutes)
   - Recovery notifications: Yes

   **SMS Alerts** (Optional, paid feature):
   - For critical 24/7 on-call
   - $0.05 per SMS

6. **Create Status Page**:

   **Basic Configuration**:
   - **Name**: AltarFlow Status
   - **Subdomain**: `altarflow` → Creates `altarflow.betterstack.com`
   - **Timezone**: America/Los_Angeles
   - **Public**: Yes (allows users to subscribe for updates)

   **Add Components to Status Page**:
   ```
   Group: Core Services
     ├─ System Health (api/health monitor)
     ├─ Database (auto-detected from health check)
     └─ Environment Config (auto-detected)

   Group: API Services
     ├─ Metrics API (api/health/metrics monitor)
     ├─ Donation Processing (donations API monitor)
     └─ Authentication (Clerk monitor)

   Group: External Dependencies
     ├─ Stripe Payment Gateway
     ├─ Resend Email Service
     └─ Supabase Database
   ```

   **Display Settings**:
   - ✅ Show uptime percentage (last 30/60/90 days)
   - ✅ Show response time graph
   - ✅ Show incident history
   - ✅ Allow user subscriptions (email/SMS/Slack)
   - ✅ Show maintenance windows

   **Branding** (Optional):
   - Upload AltarFlow logo
   - Set primary color to match brand
   - Add footer text: "Questions? Contact hola@altarflow.com"

7. **Set Alert Rules**:
   - **Alert after**: 2 consecutive failures (6 minutes total)
   - **Escalation**: None (or configure on-call rotation)
   - **Auto-resolve**: Yes, when service recovers
   - **Maintenance mode**: Schedule maintenance windows to suppress alerts

8. **Test Your Setup**:
   ```bash
   # Verify monitors can reach your endpoints
   curl -I https://altarflow.com/api/health
   # Should return: HTTP/2 200

   # Check keyword is present
   curl https://altarflow.com/api/health | grep "healthy"
   # Should output: "status": "healthy"
   ```

9. **Set Up On-Call Schedule** (Optional):
   - Create rotation: Weekly or 24/7
   - Add team members
   - Configure escalation policy:
     - Level 1: Slack + Email (immediate)
     - Level 2: SMS after 5 minutes (paid feature)
     - Level 3: Escalate to manager after 15 minutes

**Cost**: Free for 10 monitors + status page

**Upgrade to Pro ($20/month) for:**
- 🔒 1-minute check frequency (vs. 3 minutes free)
- 🔒 Custom domain: `status.altarflow.com`
- 🔒 SMS alerts
- 🔒 50 monitors (vs. 10 free)
- 🔒 Advanced incident management

---

### 📊 Recommended Status Page Components

**Critical Components** (Must monitor):
- ✅ System Health (`/api/health`)
- ✅ Database Connectivity
- ✅ Donation Processing
- ✅ Authentication Service

**Important Components**:
- ✅ API Metrics Endpoint
- ✅ Stripe Payment Gateway (external)
- ✅ Email Delivery Service (Resend)
- ✅ File Storage (Supabase Storage)

**Optional Components**:
- Member Portal
- Admin Dashboard
- Expense Management
- AI Features (Report Generation)

**External Dependencies to Monitor**:
```
Stripe API: https://status.stripe.com (use their status feed)
Resend API: https://status.resend.com (use their status feed)
Supabase: https://status.supabase.com (use their status feed)
Clerk Auth: https://status.clerk.com (use their status feed)
```

**How to Add External Status Feeds**:
Better Stack can aggregate external status pages:
1. Go to Status Page → **External Status Feeds**
2. Add RSS/Atom feeds from third-party status pages
3. Automatically shows incidents from Stripe, Resend, Supabase, Clerk

---

### 🎯 What Your Status Page Will Look Like:

```
┌─────────────────────────────────────────────────────┐
│  🏛️ AltarFlow Status                                │
│  All Systems Operational ✅                         │
│  Last updated: 2 minutes ago                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  CORE SERVICES                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                     │
│  ✅ System Health              99.98% uptime        │
│     ████████████████████████████ ▁  30 days        │
│     Response: 52ms | Last check: 1 min ago         │
│                                                     │
│  ✅ Database                   100% uptime          │
│     █████████████████████████████   30 days        │
│     Response: 15ms | Last check: 1 min ago         │
│                                                     │
│  ✅ Environment Config         100% uptime          │
│     █████████████████████████████   30 days        │
│                                                     │
│  API SERVICES                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                     │
│  ✅ Donation Processing        99.95% uptime        │
│     ████████████████████████████▁   30 days        │
│     Response: 180ms | Last check: 3 min ago        │
│                                                     │
│  ✅ Authentication             99.99% uptime        │
│     █████████████████████████████   30 days        │
│     Response: 95ms | Last check: 2 min ago         │
│                                                     │
│  EXTERNAL DEPENDENCIES                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                     │
│  ✅ Stripe Payment Gateway     Operational          │
│     Source: status.stripe.com                      │
│                                                     │
│  ✅ Resend Email Service       Operational          │
│     Source: status.resend.com                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│  📊 Uptime Overview (Last 90 Days)                 │
│                                                     │
│  Nov  ████████████████████████████████  100%      │
│  Oct  ███████████████████████████████▁  99.8%     │
│  Sep  ████████████████████████████████  100%      │
│                                                     │
├─────────────────────────────────────────────────────┤
│  📜 Incident History                               │
│                                                     │
│  ✅ Nov 15, 2025 - Resolved                        │
│     Database connection timeout                    │
│     Duration: 3 minutes                            │
│     Status: Investigating → Identified → Resolved  │
│                                                     │
│  ⚙️ Oct 28, 2025 - Completed                       │
│     Scheduled Maintenance: Database Upgrade        │
│     Duration: 15 minutes                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│  🔔 Subscribe for Updates                          │
│  Get notified via Email, SMS, or Slack            │
│  [Subscribe Button]                                │
│                                                     │
│  📧 Email: you@example.com                         │
│  📱 SMS: +1 (555) 123-4567                         │
│  💬 Slack: Connect workspace                       │
└─────────────────────────────────────────────────────┘
      Questions? Contact hola@altarflow.com
      Powered by Better Stack
```

---

### 💬 Integrating Slack with Better Stack

**Why Two Slack Integrations?**

You now have **two separate Slack integrations** that work together:

1. **Sentry → Slack** (Already configured ✅)
   - Sends: Application errors, payment failures, slow queries
   - Channel: #monitoring
   - Triggered by: Your application code via logger

2. **Better Stack → Slack** (Set up after deployment)
   - Sends: Service downtime alerts, uptime recovery, slow response times
   - Channel: #monitoring (same channel!)
   - Triggered by: External monitoring pings

**How They Work Together:**

```
Application Error (e.g., payment fails)
  ↓
Sentry detects → Slack notification
"🔥 Payment Failure - $100 - Card declined"

────────────────────────────────────

Server Goes Down (e.g., database crash)
  ↓
Better Stack detects → Slack notification
"🚨 AltarFlow is DOWN - Health check failed"
```

**Recommended Slack Channel Setup:**

```
#monitoring (Both integrations post here)
  ├─ Sentry alerts (errors, performance, business issues)
  └─ Better Stack alerts (uptime, downtime, recovery)

#incidents (Optional - escalation channel)
  └─ Major outages requiring immediate attention
```

**Setting Up Better Stack Slack Integration:**

1. In Better Stack dashboard:
   - Go to **Integrations** → **Slack**
   - Click **Add to Slack**
   - Authorize Better Stack app

2. Configure notifications:
   - Select channel: **#monitoring**
   - Message format: **Rich** (includes uptime graphs)
   - Send notifications for:
     ✅ Monitor goes down
     ✅ Monitor recovers
     ✅ Slow response (>2s)
     ⏭️ Maintenance started/ended (optional)

3. Test integration:
   - Click **Send Test Message**
   - Verify message appears in #monitoring

**Example Slack Messages:**

**From Sentry** (application errors):
```
🔥 Payment Failure
A donation payment has failed and requires immediate attention.
Amount: $100.00 | Church: First Baptist
Error: Card declined: insufficient_funds
```

**From Better Stack** (uptime monitoring):
```
🚨 AltarFlow Production Health is DOWN
Health check failed: Connection timeout
Started: 2:30 PM PST
Duration: 3 minutes
Status Page: altarflow.betterstack.com
```

**Recovery notification:**
```
✅ AltarFlow Production Health is UP
Service recovered after 3 minutes of downtime
Uptime: 99.98% (last 30 days)
```

---

### Option 3: UptimeRobot (Free Alternative)

**Free tier**: 50 monitors, 5-minute checks

**Setup:**

1. **Sign up**: https://uptimerobot.com/

2. **Add Monitor**:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: AltarFlow Health Check
   - **URL**: `https://your-domain.com/api/health`
   - **Monitoring Interval**: 5 minutes

3. **Alert Contacts**:
   - Add email notifications
   - Add Slack webhook (via webhooks)

4. **Public Status Page** (Optional):
   - Create public status page
   - Share with users: `https://status.altarflow.com`

**Cost**: Free forever

---

### Option 4: Sentry Uptime Monitoring (Integrated)

**If you have Sentry Business/Enterprise plan**

**Setup:**

1. Go to Sentry Dashboard
2. Navigate to **Crons** → **Uptime Monitors**
3. Click **Create Uptime Monitor**
4. Configure:
   - **URL**: `https://your-domain.com/api/health`
   - **Check Interval**: 1 minute
   - **Alert On**: 3 consecutive failures

**Benefits:**
- ✅ Integrated with existing Sentry alerts
- ✅ Correlation with error tracking
- ✅ Same dashboard for everything

**Cost**: Requires paid Sentry plan

---

## Sentry Dashboards

### Dashboard 1: Business Health Dashboard

**Purpose**: Track business KPIs and revenue metrics

**⚠️ IMPORTANT: Set up AFTER deploying to production and generating some business metrics!**

**Complete Step-by-Step Setup:**

#### Step 1: Access Sentry Dashboards

1. Go to https://sentry.io/
2. Select your organization: **AltarFlow**
3. In the left sidebar, find and click **Dashboards**
4. Click the **Create Dashboard** button (top right)

#### Step 2: Configure Dashboard

1. **Dashboard Name**: Enter "Business Health"
2. **Dashboard Description** (optional): "Track donation metrics, revenue, and member activity"
3. Click **Create Dashboard**

#### Step 3: Add Widget 1 - Donation Count (24h)

1. Click **Add Widget** button
2. Configure widget:
   ```
   Widget Type: Big Number

   Query Section:
   ────────────
   Dataset: Discover

   Field to Display:
   - Click dropdown → Select "count()"

   Search/Filter:
   - Enter: operation:"metrics.donation.completed"

   Time Range:
   - Select: "Last 24 hours"

   Widget Title:
   - Enter: "Donations (24h)"
   ```
3. Click **Add Widget**

#### Step 4: Add Widget 2 - Total Revenue (24h)

1. Click **Add Widget** button
2. Configure widget:
   ```
   Widget Type: Big Number

   Query Section:
   ────────────
   Dataset: Discover

   Field to Display:
   - Click dropdown → Select "sum(amount)"
   - (If "amount" not visible, type it manually)

   Search/Filter:
   - Enter: operation:"metrics.donation.completed"

   Time Range:
   - Select: "Last 24 hours"

   Widget Title:
   - Enter: "Total Revenue (24h)"

   Display Options:
   - Click "Display" tab
   - Format: Currency ($)
   ```
3. Click **Add Widget**

#### Step 5: Add Widget 3 - Top Churches by Donations

1. Click **Add Widget** button
2. Configure widget:
   ```
   Widget Type: Table

   Query Section:
   ────────────
   Dataset: Discover

   Columns to Display:
   - Add column: "churchId"
   - Add column: "count()"

   Search/Filter:
   - Enter: operation:"metrics.donation.completed"

   Sort By:
   - Select: "count()"
   - Direction: Descending
   - Limit: 10

   Time Range:
   - Select: "Last 7 days"

   Widget Title:
   - Enter: "Top Churches by Donations"
   ```
3. Click **Add Widget**

#### Step 6: Add Widget 4 - Donation Trend (7 days)

1. Click **Add Widget** button
2. Configure widget:
   ```
   Widget Type: Line Chart

   Query Section:
   ────────────
   Dataset: Discover

   Y-Axis:
   - Select: "count()"

   Search/Filter:
   - Enter: operation:"metrics.donation.completed"

   Time Range:
   - Select: "Last 7 days"

   Group By:
   - Interval: "1 day"

   Widget Title:
   - Enter: "Donation Trend (7 days)"

   Display Options:
   - Chart type: Line
   - Show legend: Yes
   ```
3. Click **Add Widget**

#### Step 7: Add Widget 5 - Payment Method Breakdown

1. Click **Add Widget** button
2. Configure widget:
   ```
   Widget Type: Pie Chart (or Bar Chart)

   Query Section:
   ────────────
   Dataset: Discover

   Y-Axis:
   - Select: "count()"

   Search/Filter:
   - Enter: operation:"metrics.donation.completed"

   Group By:
   - Add: "method"

   Time Range:
   - Select: "Last 30 days"

   Widget Title:
   - Enter: "Payment Methods"

   Display Options:
   - Chart type: Pie (or Bar if pie not available)
   - Show values: Yes
   - Show percentages: Yes
   ```
3. Click **Add Widget**

#### Step 8: Add Widget 6 - New Members (7 days)

1. Click **Add Widget** button
2. Configure widget:
   ```
   Widget Type: Line Chart

   Query Section:
   ────────────
   Dataset: Discover

   Y-Axis:
   - Select: "count()"

   Search/Filter:
   - Enter: operation:"metrics.member.created"

   Time Range:
   - Select: "Last 7 days"

   Group By:
   - Interval: "1 day"

   Widget Title:
   - Enter: "New Members (7 days)"

   Display Options:
   - Chart type: Line
   - Line color: Green
   ```
3. Click **Add Widget**

#### Step 9: Configure Dashboard Settings

1. Click the **⚙️ Settings** icon (top right of dashboard)
2. Configure:
   ```
   Auto-Refresh:
   - Enable: Yes
   - Interval: 5 minutes

   Time Range (Default):
   - Set: Last 24 hours

   Visibility:
   - Set: Team members only (or Public if you want)

   Notifications:
   - (Optional) Set up alerts for threshold breaches
   ```
3. Click **Save Changes**

#### Step 10: Arrange and Save

1. **Drag widgets** to arrange them in a logical layout:
   ```
   ┌─────────────────────────────────────────┐
   │ Donations (24h)  │  Total Revenue (24h) │
   ├─────────────────────────────────────────┤
   │     Donation Trend (7 days)             │
   ├─────────────────────────────────────────┤
   │ Top Churches     │  Payment Methods     │
   ├─────────────────────────────────────────┤
   │     New Members (7 days)                │
   └─────────────────────────────────────────┘
   ```

2. Click **Save** button (top right)

3. **Share dashboard** with team:
   - Click **Share** button
   - Copy dashboard URL
   - Send to team or pin in Slack

---

#### Troubleshooting Dashboard Setup

**No Data Showing?**

1. **Check if metrics are being logged**:
   ```bash
   # In production, trigger a test donation or check logs
   # Verify Sentry is receiving events
   ```

2. **Verify operation names**:
   - Go to Sentry → **Discover**
   - Search for: `operation:metrics.*`
   - Verify events appear with correct operation names

3. **Check time range**:
   - If using "Last 24 hours" but no recent activity, change to "Last 30 days"

4. **Verify field names**:
   - Custom fields (like `amount`, `method`, `churchId`) must match exactly
   - Check your `lib/metrics.ts` to confirm field names

**Widget Not Loading?**

- Refresh the page
- Check Sentry status: https://status.sentry.io
- Verify your Sentry plan supports custom dashboards (free tier should work)

**Can't Find "sum(amount)" Field?**

- Type it manually in the field dropdown
- Ensure your metrics are logging the `amount` field
- Check sample event in Discover to see available fields

---

### Alternative: Quick Dashboard Setup (Copy Template)

**If the manual setup is too complex**, use this query-based approach:

1. **Create Dashboard**: Click "Create Dashboard" → Name it "Business Health"

2. **Instead of manual widget creation**, create a **Saved Query** first:
   - Go to **Discover** → Create new query
   - Query: `operation:"metrics.donation.completed"`
   - Save as: "All Donations"

3. **Import query to dashboard**:
   - From dashboard, click "Add Widget"
   - Select "Use existing query"
   - Choose "All Donations"
   - Customize visualization (Big Number, Chart, Table)

---

### Dashboard Best Practices

✅ **Do:**
- Set auto-refresh to 5 minutes for real-time monitoring
- Use consistent time ranges across related widgets
- Add descriptions to widgets explaining what they track
- Share dashboard URL with team in Slack
- Review dashboard weekly for trends

❌ **Don't:**
- Create too many widgets (6-8 is ideal)
- Use overly complex queries that slow down loading
- Mix different time ranges without clear labels
- Forget to test with real data before sharing

---

### 3. **Add Widgets** (Detailed Configuration):

   **Widget 1: Donation Success Rate (24h)**
   ```
   Type: Big Number
   Query:
     - Filter: operation:metrics.donation.completed
     - Timeframe: 24h
     - Calculate: Count
   ```

   **Widget 2: Total Revenue (24h)**
   ```
   Type: Big Number
   Query:
     - Filter: operation:metrics.donation.completed
     - Field: amount
     - Aggregate: Sum
   ```

   **Widget 3: Top Churches by Donations**
   ```
   Type: Table
   Query:
     - Filter: operation:metrics.donation.completed
     - Group by: churchId
     - Order by: Count (descending)
     - Limit: 10
   ```

   **Widget 4: Donation Trend (7 days)**
   ```
   Type: Line Chart
   Query:
     - Filter: operation:metrics.donation.completed
     - Timeframe: 7d
     - Group by: Day
   ```

   **Widget 5: Payment Method Breakdown**
   ```
   Type: Pie Chart
   Query:
     - Filter: operation:metrics.donation.completed
     - Group by: method
   ```

   **Widget 6: New Members (7 days)**
   ```
   Type: Line Chart
   Query:
     - Filter: operation:metrics.member.created
     - Timeframe: 7d
     - Group by: Day
   ```

4. **Set Refresh**: Auto-refresh every 5 minutes

---

### Dashboard 2: System Health Dashboard

**Purpose**: Monitor application performance and errors

**Setup Steps:**

1. **Create New Dashboard**: "System Health"

2. **Add Widgets**:

   **Widget 1: Error Rate (1h)**
   ```
   Type: Line Chart
   Query:
     - Event type: Error
     - Timeframe: 1h
     - Group by: 5 minutes
   ```

   **Widget 2: Top Errors by Count**
   ```
   Type: Table
   Query:
     - Event type: Error
     - Group by: Error message
     - Order by: Count (descending)
     - Limit: 10
   ```

   **Widget 3: Errors by Service**
   ```
   Type: Pie Chart
   Query:
     - Event type: Error
     - Group by: operation (extract domain)
     - Timeframe: 24h
   ```

   **Widget 4: P95 Response Time**
   ```
   Type: Line Chart
   Query:
     - Filter: operation:performance.*
     - Field: durationMs
     - Aggregate: P95
     - Timeframe: 6h
   ```

   **Widget 5: Slow Queries (>1s)**
   ```
   Type: Table
   Query:
     - Filter: operation:performance.warn.* OR operation:performance.critical.*
     - Field: durationMs
     - Order by: Duration (descending)
   ```

   **Widget 6: Cron Job Health**
   ```
   Type: Table
   Query:
     - Filter: operation:cron.*
     - Group by: Job name
     - Show: Success/Failure counts
   ```

---

### Dashboard 3: User Experience Dashboard

**Purpose**: Track frontend performance and user errors

**Setup Steps:**

1. **Create New Dashboard**: "User Experience"

2. **Add Widgets**:

   **Widget 1: Page Load Times**
   ```
   Type: Line Chart
   Source: Performance monitoring
   Metric: Page load time (P75)
   Timeframe: 24h
   ```

   **Widget 2: JavaScript Errors by Page**
   ```
   Type: Table
   Query:
     - Platform: JavaScript
     - Group by: URL path
     - Order by: Count
   ```

   **Widget 3: Browser Breakdown**
   ```
   Type: Pie Chart
   Query:
     - Group by: Browser
     - Timeframe: 7d
   ```

   **Widget 4: Core Web Vitals**
   ```
   Type: Big Numbers (3 widgets)
   Metrics:
     - LCP (Largest Contentful Paint)
     - FID (First Input Delay)
     - CLS (Cumulative Layout Shift)
   ```

   **Widget 5: Error Rate by Page**
   ```
   Type: Heatmap
   Query:
     - Platform: JavaScript
     - Group by: Page + Hour
     - Show: Error count
   ```

---

## Testing

### Test Health Endpoints

**1. Test Health Check**

```bash
# Local
curl http://localhost:3000/api/health | jq .

# Production
curl https://your-domain.com/api/health | jq .
```

**Expected**: 200 OK with "healthy" status

**2. Test Metrics**

```bash
# Local
curl http://localhost:3000/api/health/metrics | jq .

# Production
curl https://your-domain.com/api/health/metrics | jq .
```

**Expected**: JSON with donation, expense, and member metrics

---

### Test Uptime Monitor

**Simulate Downtime:**

1. Stop your application
2. Wait for monitor to detect (3-5 minutes)
3. Check for alert in Slack/Email
4. Restart application
5. Verify auto-recovery notification

**Expected**:
- Alert sent within 5 minutes of downtime
- Recovery notification sent when app restarts

---

### Test Sentry Dashboards

**Generate Test Data:**

```typescript
// Run this script to generate test metrics
import { metrics } from '@/lib/metrics';

// Generate 10 test donations
for (let i = 0; i < 10; i++) {
  metrics.donation.completed({
    donationId: `test-${i}`,
    amount: 100,
    method: 'card',
    recurring: false,
    churchId: 'test-church',
  });
}

// Wait 30 seconds, then check Sentry dashboard
```

**Verify**:
- Metrics appear in Business Health dashboard
- Charts update in real-time
- Filters work correctly

---

## Quick Setup Checklist

### ✅ Completed Setup
- [x] Create `/api/health` endpoint
- [x] Create `/api/health/metrics` endpoint
- [x] Slack webhook integration configured
- [x] Automatic Slack notifications for critical errors
- [x] Sentry error tracking integration
- [x] Business metrics tracking (donations, members, expenses)
- [x] Performance monitoring (API, DB queries, external calls)
- [x] Cron job monitoring (2 jobs tracked)

### 🚀 Next Steps: Deploy & Monitor

**Before Production Deployment:**
- [ ] Test health endpoints locally
  ```bash
  curl http://localhost:3000/api/health | jq .
  curl http://localhost:3000/api/health/metrics | jq .
  ```
- [ ] Add `SLACK_WEBHOOK_URL` to Vercel environment variables
- [ ] Deploy to production
- [ ] Verify health endpoints in production

**After Production Deployment:**
- [ ] Set up Better Stack (Recommended):
  1. [ ] Sign up at https://betterstack.com
  2. [ ] Select: Uptime monitoring + Status page + On-call
  3. [ ] Create monitor for `/api/health`
  4. [ ] Connect Slack to #monitoring channel
  5. [ ] Create public status page
  6. [ ] Add external status feeds (Stripe, Resend, Supabase, Clerk)
  7. [ ] Test monitor by checking first ping
- [ ] **OR** Use Vercel Analytics (already active, no setup needed)

**Optional Enhancements:**
- [ ] Create Sentry Business Health Dashboard
- [ ] Create Sentry System Health Dashboard
- [ ] Create Sentry User Experience Dashboard
- [ ] Set up on-call rotation in Better Stack
- [ ] Upgrade to Better Stack Pro for custom domain ($20/mo)
- [ ] Configure maintenance windows for planned outages

---

## Maintenance

### Daily
- ✅ Auto-checked by uptime monitor
- ✅ Auto-alerted if issues detected

### Weekly
- [ ] Review dashboard metrics
- [ ] Check for performance regressions
- [ ] Review slow query alerts

### Monthly
- [ ] Review uptime statistics (should be >99.9%)
- [ ] Update alert thresholds if needed
- [ ] Review and update dashboards

---

## Cost Summary

| Service | Free Tier | Paid Tier | Recommendation |
|---------|-----------|-----------|----------------|
| **Vercel Analytics** | Included | Included | ✅ Use this (already active) |
| **Better Uptime** | 10 monitors | $10/month | ⭐ Best alerts |
| **UptimeRobot** | 50 monitors | $7/month | Good free option |
| **Sentry Dashboards** | Included | Included | ✅ Use this |
| **Sentry Uptime** | N/A | $29/month | Only if on paid plan |

**Recommended Setup**: Vercel Analytics + Sentry Dashboards (Total: $0/month)

---

## Support

**Questions?**
- Health Endpoints: See `/app/api/health/route.ts`
- Metrics: See `/app/api/health/metrics/route.ts`
- Sentry: https://docs.sentry.io/product/dashboards/
- Better Uptime: https://docs.betteruptime.com/

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
