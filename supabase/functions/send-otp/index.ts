// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
  
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "jsr:@supabase/supabase-js";
import twilio from "https://esm.sh/twilio@5.3.7?target=deno"
import { getBestTwilioNumber } from "../_shared/helpers.ts";
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const twilioClient = new twilio.Twilio(Deno.env.get('TWILIO_SID')!, Deno.env.get('TWILIO_AUTH_TOKEN')!);

Deno.serve(async (req) => {
  const { to, prefix } = await req.json()

  if (!to) {
    return new Response(JSON.stringify({ error: 'Phone number is required' }), { status: 400 });
  }
  if (!prefix) {
    return new Response(JSON.stringify({ error: 'Prefix is required' }), { status: 400 });
  }
  // Generate a random 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const from = await getBestTwilioNumber(prefix, supabase)

  const { error } = await supabase.from('otp').insert([
    { phone_number: to, otp_code: otpCode, expires_at: new Date(Date.now() + 5 * 60 * 1000) },
  ]);
  if (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Failed to store OTP' }), { status: 500 });
  }
  const message = `Your Code for amics.ai is: ${otpCode}. It expires in 5 minutes.`;
  const twilioMessage = await twilioClient.messages.create({
    to: to,
    from: from,
    body: message,
  });
  
  if (twilioMessage.errorMessage) {
    console.error(twilioMessage.errorMessage)
    return new Response(JSON.stringify({ error: 'Failed to send OTP' }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ success: true, message: twilioMessage.sid, price: twilioMessage.price }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-otp' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
