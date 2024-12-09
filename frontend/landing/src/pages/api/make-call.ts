import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
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

    const data = await response.json();
    return new Response(JSON.stringify(data), {
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