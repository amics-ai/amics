import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabase";

export const POST: APIRoute = async ({ request,cookies }) => {
  try {
    const { to } = await request.json();

    const response = await fetch('https://wlvyfoydbvsbcfindisa.supabase.co/functions/v1/make-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ to }),
    });

    if (!response.ok) {
      throw new Error('Failed to make call');
    }
    const accessToken = cookies.get("sb-access-token")?.value;
    const { data, error } = await supabaseAdmin.from('phone_numbers').insert({
      user_id: accessToken ? (await supabaseAdmin.auth.getUser(accessToken)).data.user?.id : null,
      phone_number: to,
    });
    console.log(data, error);
    return new Response( "ok", {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 