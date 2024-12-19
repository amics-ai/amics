"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export async function saveFeedback(formData: FormData) {
  
  const supabase = await createClient()

  const rating = formData.get('rating')
  const feedback = formData.get('feedback')
  const callSid = formData.get('call_sid')
  console.log(callSid)
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      call_sid: callSid,
      rating: rating,
      feedback: feedback
    })
    .select()

  if (error) {
    console.error('Error saving feedback:', error)
    throw new Error('Failed to save feedback')
  }
  if (data) {
    await supabase.from('calls').update({ feedback: data[0].id }).eq('call_sid', callSid)
  }
  revalidatePath('/protected')
  return { success: true }
}

export async function savePhoneNumber(formData: FormData) {
  "use server"
  const phoneNumber = formData.get('phone')
  const prefix = formData.get('prefix')
  const supabase = await createClient()

  const { user } = await supabase.auth.getUser().then(({ data }) => data)

  const { error } = await supabase
    .from('phone_numbers')
    .insert({
      phone_number: (prefix as string) + (phoneNumber as string),
      prefix: prefix as string,
      user_id: user?.id,
    })

  if (error) {
    console.error('Error saving phone number:', error)
    throw new Error('Failed to save phone number')
  }
  revalidatePath('/protected')
}

export async function updatePhoneNumber(formData: FormData, previousPhoneNumber: string) {
  const phoneNumber = formData.get('phone')
  const prefix = formData.get('prefix')
  const supabase = await createClient()

  const { user } = await supabase.auth.getUser().then(({ data }) => data)
  console.log(user?.id, phoneNumber, prefix)
  if (!user) {
    throw new Error('User not found')
  }

  const { data, error } = await supabase
    .from('phone_numbers')
    .update({ 
      phone_number: (prefix as string) + (phoneNumber as string), 
      prefix: prefix as string 
    })
    .eq('phone_number', previousPhoneNumber)
    .eq('user_id', user?.id)
    .select()
  if (error) {
    console.error('Error updating phone number:', error)
    throw new Error('Failed to update phone number')
  }
  if (data) {
    console.log('Phone number updated:', data)
  }
  revalidatePath('/protected')
  return { success: true }
}

export async function initiateCall() {
  const supabase = await createClient()
  const { user } = await supabase.auth.getUser().then(({ data }) => data)

  const { data: phoneNumber } = await supabase
    .from('phone_numbers')
    .select('phone_number, prefix')
    .eq('user_id', user?.id)
    .single();

  const { data: calls } = await supabase
    .from('calls')
    .select('id')
    .eq('to_number', phoneNumber?.phone_number)
    .limit(1);

  const isInitial = !calls || calls.length === 0;

  if (!phoneNumber) {
    throw new Error('Phone number not found')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/make-call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      to: phoneNumber.phone_number,
      prefix: phoneNumber.prefix,
      isInitial: isInitial,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to initiate call: ' + response.statusText)
  } else {
    revalidatePath('/protected')
  }
}