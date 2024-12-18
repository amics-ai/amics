// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'jsr:@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const { phone, otp_code } = await req.json();
  if (!phone || !otp_code) {
    return new Response(JSON.stringify({ error: 'Phone number and OTP code are required' }), { status: 400 });
  }

  const { data, error } = await supabase.from('otp').select('*').eq('phone_number', phone).eq('otp_code', otp_code).single();
  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Invalid OTP code', code: 'INVALID' }), { status: 400 });
  }

  // Check if OTP is expired
  const currentTime = new Date();
  if (new Date(data.expires_at) < currentTime) {
    return new Response(JSON.stringify({ error: 'OTP expired', code: 'EXPIRED' }), { status: 400 });
  }

  return new Response(
    JSON.stringify({ message: 'OTP verified successfully' }),
    { status: 200 , headers: { "Content-Type": "application/json" } }

  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/verify-otp' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
