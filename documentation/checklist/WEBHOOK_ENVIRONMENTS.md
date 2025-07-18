# Webhook Environment Configuration

## The Problem
- Stripe CLI webhooks use a different secret (whsec_xxx) than Dashboard webhooks
- Your ngrok URL is configured in Stripe Dashboard but you're using CLI secret
- This causes signature verification failures

## Solution: Environment-Based Webhook Secrets

### 1. Update .env files:

**.env.local** (for Stripe CLI testing):
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxx  # From stripe listen --forward-to
```

**.env.development** (for ngrok testing):
```env
STRIPE_WEBHOOK_SECRET=whsec_yyyyyy  # From Stripe Dashboard webhook endpoint
```

**.env.production**:
```env
STRIPE_WEBHOOK_SECRET=whsec_zzzzzz  # From production webhook endpoint
```

### 2. Testing Workflow:

**Local Development (Stripe CLI)**:
```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook secret to .env.local
```

**Ngrok Testing**:
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000

# In Stripe Dashboard:
# 1. Go to Webhooks
# 2. Update endpoint URL to your ngrok URL
# 3. Copy the webhook secret to .env.development
```

### 3. Quick Switch Script:

Create `scripts/switch-webhook.js`:
```javascript
const fs = require('fs');
const path = require('path');

const mode = process.argv[2]; // 'cli' or 'dashboard'

const secrets = {
  cli: 'whsec_your_cli_secret',
  dashboard: 'whsec_your_dashboard_secret'
};

const envPath = path.join(__dirname, '../.env');
let envContent = fs.readFileSync(envPath, 'utf8');

envContent = envContent.replace(
  /STRIPE_WEBHOOK_SECRET=.*/,
  `STRIPE_WEBHOOK_SECRET=${secrets[mode]}`
);

fs.writeFileSync(envPath, envContent);
console.log(`Switched to ${mode} webhook secret`);
```

Run with: `node scripts/switch-webhook.js cli` or `node scripts/switch-webhook.js dashboard`