// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust for production if needed
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} 