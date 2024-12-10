// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import twilio from "https://esm.sh/twilio@5.3.7?target=deno"

// Get your Account SID and Auth Token from twilio.com/console
const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')


//const RAW_DOMAIN = Deno.env.get('SUPABASE_URL') + "/functions/v1"

// Constants

const outboundTwiMLSupabase = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://wlvyfoydbvsbcfindisa.supabase.co/functions/v1/handle-conversation" />
  </Connect>
</Response>`;
const outboundTwiMLCloudflare = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://openai-realtime-api.supabase.co/functions/v1/handle-conversation" />
  </Connect>
</Response>`;

if (!accountSid || !authToken) {
  throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set')
}

const client = new twilio.Twilio(accountSid, authToken)

Deno.serve(async (req) => {
  const { to, test } = await req.json();
  if (!to) {
    return new Response(JSON.stringify({ error: "Missing 'to' parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const call = await client.calls.create({
      twiml: test ? outboundTwiMLSupabase : outboundTwiMLCloudflare, // Your TwiML URL
      to: to!, // Replace with the phone number you want to call
      from: "+14437674148", // Replace with your Twilio phone number
    })

    return new Response(
      JSON.stringify({ success: true, callSid: call.sid }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

})

