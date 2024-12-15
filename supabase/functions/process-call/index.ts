import { Hono } from 'jsr:@hono/hono'
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2";


const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const app = new Hono().basePath(`/process-call`);

app.post("/", async (c) => {
  const { recording_url } = await c.req.json()
  const { error } = await supabase.storage.from('conversations').download(recording_url)
  if (error) {
    return c.json({ error: error.message }, { status: 500 })
  }
  return c.json({ message: "Recording downloaded" })
})