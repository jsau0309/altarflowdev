// supabase/functions/add-church-claim/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8' // Use esm.sh for Deno compatibility - REMOVED
import { corsHeaders } from '../_shared/cors.ts' // Assuming you have CORS headers defined

console.log('Add Church Claim function initializing (SIMPLIFIED TEST + SECRET VALIDATION)')

// Get the expected secret from environment variables
const AUTH_HOOK_SECRET = Deno.env.get('AUTH_HOOK_SECRET')

serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Add Church Claim Hook Triggered (SIMPLIFIED TEST + SECRET VALIDATION)')

  // --- SECRET VALIDATION --- 
  if (!AUTH_HOOK_SECRET) {
      console.error('AUTH_HOOK_SECRET environment variable not set.');
      // Return 500 if the secret isn't configured in the function's env vars
      return new Response(JSON.stringify({ error: 'Function configuration error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
      });
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header.');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 // Unauthorized
      });
  }

  const receivedSecret = authHeader.substring(7); // Remove 'Bearer '
  if (receivedSecret !== AUTH_HOOK_SECRET) {
      console.error('Invalid secret received.');
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 // Forbidden
      });
  }
  // --- END SECRET VALIDATION --- 

  console.log('Secret validation passed.')

  try {
    // Try to log the user ID if possible, but don't fail if it's missing
    try {
        const { user } = await req.json()
        const userId = user?.id || 'User ID not found in request';
        console.log(`Simplified Hook: Processing request for user: ${userId}`);
    } catch (parseError) {
        console.error('Simplified Hook: Error parsing request body:', parseError);
    }

    // ALWAYS return empty claims successfully
    console.log('Simplified Hook: Returning empty claims.')
    const claims = {}; // Empty claims
    return new Response(JSON.stringify({ claims }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    // Log any unexpected error during basic processing
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Simplified Hook: Unexpected error in catch block:', message, error)

    // Still attempt to return empty claims successfully
    return new Response(JSON.stringify({ claims: {} }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})