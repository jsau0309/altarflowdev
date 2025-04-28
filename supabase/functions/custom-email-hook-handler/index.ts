import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts' // Assuming you might have shared CORS headers

console.log("Custom Email Hook Handler function booting up.");

serve(async (req: Request) => {
  // This function needs to handle CORS requests, even for webhooks
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    console.log("Received email hook payload:", JSON.stringify(payload, null, 2));

    // --- IMPORTANT ---
    // We always prevent Supabase from sending the default email
    // because we intend to send our own custom email via Resend
    // from our Next.js API routes / Server Actions.

    // Respond to Supabase telling it *not* to send the email.
    // The presence of the 'should_send_email' key set to false does this.
    const responsePayload = {
      should_send_email: false
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error processing email hook:", error);
    // Even on error, try to prevent Supabase sending, but signal error
    return new Response(
        JSON.stringify({ error: "Error processing hook", should_send_email: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})

/*
To deploy: supabase functions deploy custom-email-hook-handler --no-verify-jwt
Note: --no-verify-jwt is used because this hook is called by Supabase itself,
not directly by a user with a JWT. You might add other security later (e.g., a secret).
*/