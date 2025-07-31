-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a cron job to send scheduled email campaigns every 5 minutes
SELECT cron.schedule(
  'send-scheduled-campaigns', -- job name
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.app_url', true) || '/api/cron/send-scheduled-campaigns',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('send-scheduled-campaigns');

-- IMPORTANT: You need to set these custom settings in Supabase Dashboard:
-- 1. Go to Settings > Database > Database Settings
-- 2. Add these under "Session settings":
--    app.settings.app_url = 'https://your-domain.com'
--    app.settings.cron_secret = 'your-cron-secret'
-- 
-- For development with ngrok:
--    app.settings.app_url = 'https://testaltarflow.ngrok.app'
--    app.settings.cron_secret = 'your-dev-cron-secret'