import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  let email: string | undefined;
  let password: string | undefined;

  // Handle both JSON and form data
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const body = await request.json();
    email = body.email;
    password = body.password;
  } else {
    const formData = await request.formData();
    email = formData.get("email")?.toString();
    password = formData.get("password")?.toString();
  }

  if (!email || !password) {
    return new Response("Email and password are required", { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const { access_token, refresh_token } = data.session;
  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });
  return redirect("/phone");
}; 