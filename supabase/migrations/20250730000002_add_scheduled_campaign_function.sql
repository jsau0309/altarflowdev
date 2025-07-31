-- Create a function to process scheduled campaigns
-- This is a simpler approach that marks campaigns as ready to send
-- Your application will need to poll for these campaigns

CREATE OR REPLACE FUNCTION process_scheduled_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all scheduled campaigns that are ready to be sent
  -- Change status from SCHEDULED to READY_TO_SEND
  UPDATE "EmailCampaign"
  SET 
    status = 'READY_TO_SEND',
    "updatedAt" = NOW()
  WHERE 
    status = 'SCHEDULED' 
    AND "scheduledFor" <= NOW();
END;
$$;

-- Create a cron job to run every minute
-- This just marks campaigns as ready, your app needs to poll and send them
SELECT cron.schedule(
  'process-scheduled-campaigns',
  '* * * * *', -- every minute
  'SELECT process_scheduled_campaigns();'
);

-- Note: Since we can't make HTTP requests from within the database easily,
-- this approach requires your application to:
-- 1. Poll for campaigns with status = 'READY_TO_SEND'
-- 2. Process them and update status to 'SENDING' then 'SENT'
-- 
-- You could add a simple polling endpoint or background job in your app:
-- setInterval(() => {
--   fetch('/api/internal/process-ready-campaigns')
-- }, 30000) // every 30 seconds