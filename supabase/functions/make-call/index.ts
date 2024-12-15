import { Hono } from 'jsr:@hono/hono'

import twilio from "https://esm.sh/twilio@5.3.7?target=deno"
// change this to your function name
const functionName = 'make-call'
const app = new Hono().basePath(`/${functionName}`)

// Get your Account SID and Auth Token from twilio.com/console
const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')


if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set')
  }

const client = new twilio.Twilio(accountSid, authToken)

app.post('/', async (c) => {
    const { to, from, init, voice } = await c.req.json()

    if (!to) {
      return c.json({ error: "Missing 'to' parameter" }, { status: 400 })
  }
    const outboundTwiMLSupabase = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="wss://wlvyfoydbvsbcfindisa.supabase.co/functions/v1/handle-conversation">
          <Parameter name="init" value="${init}"/>
          <Parameter name="voice" value="${voice}"/>
          <Parameter name="from" value="${from}"/>
          <Parameter name="to" value="${to}"/>
        </Stream>
      </Connect>
    </Response>`;

    const outboundTwiMLCloudflare = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="wss://wlvyfoydbvsbcfindisa.supabase.co/functions/v1/handle-conversation">
          <Parameter name="init" value="false"/>
          <Parameter name="voice" value="${voice}"/>
          <Parameter name="from" value="${from}"/>
          <Parameter name="to" value="${to}"/>
        </Stream>
      </Connect>
    </Response>`;

    
    
    try {
    const call = await client.calls.create({
        twiml: init ? outboundTwiMLSupabase : outboundTwiMLCloudflare,
        to: to!,
        from: from!,
    })

    
    return c.json({ success: true, callSid: call.sid })
} catch (error) {
        return c.json({ error: error.message }, { status: 400 })
    }
})

Deno.serve(app.fetch)