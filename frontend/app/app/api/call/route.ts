import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's phone number
  const { data: phoneNumber } = await supabase
    .from('phone_numbers')
    .select('phone_number, prefix')
    .eq('user_id', user.id)
    .single();



  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
  }

    // Check if this is the user's first call
    const { data: previousCalls } = await supabase
    .from('calls')
    .select('id')
    .eq('to_number', phoneNumber.phone_number)
    .limit(1);

    const isInitial = !previousCalls || previousCalls.length === 0;
    console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)
  // Call the Edge Function with service role
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/make-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: phoneNumber.phone_number,
      voice: 'ember',
      prefix: phoneNumber.prefix,
      init : isInitial
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
} 