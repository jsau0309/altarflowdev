# Gemini Receipt OCR Migration Guide

_Last updated: 2025-10-12_

This guide covers the steps required to roll out the Gemini Flash 2.5-based receipt OCR pipeline in existing environments.

## 1. Prerequisites
- Google AI Studio account with billing enabled.
- Existing AltarFlow deployment running commit `main` or later.
- Access to environment variable store (Vercel, Supabase, etc.).

## 2. Obtain Gemini API Credentials
1. Visit [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Create a new API key dedicated to receipt OCR workloads.
3. Store the key securely (password manager or secrets vault).

## 3. Update Environment Variables
1. Add `GEMINI_API_KEY` to your environment (Vercel dashboard or `.env`).
2. Remove the following deprecated variables:
   - `GOOGLE_CLOUD_PROJECT_ID`
   - `GOOGLE_CLOUD_LOCATION`
   - `GOOGLE_DOCUMENT_AI_PROCESSOR_ID`
   - `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
3. Redeploy the application to refresh environment variables.

## 4. Deploy to Staging
1. Deploy the latest branch with Gemini support to staging.
2. Upload at least 10 receipts that cover:
   - Clear and well-lit photos
   - Low-light or slightly blurry images
   - Thermal receipts with faint text
   - Spanish-language receipts
3. Confirm the API response contains `extractedData.confidence` values.

## 5. Monitor After Promotion
- Track error rate in Sentry (`GeminiReceiptOcr` logger).
- Monitor API usage in Google AI Studio (set alert at $5/month).
- Review the first 100 receipts manually to ensure accuracy exceeds 85%.
- If accuracy drops below 80%, revert to the previous deployment and open an incident.

## 6. Rollback Plan
- Historic Document AI code remains in Git history (`v1.1` tag).
- Revert to commit prior to Gemini migration.
- Reintroduce the deprecated environment variables if Document AI must be restored.

## 7. Support
Contact the platform team via Slack `#altarflow-engineering` for assistance.
