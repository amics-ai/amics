import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function getBestTwilioNumber(prefix: string, supabase: SupabaseClient): Promise<string> {
    const defaultNumber = "+14437674148"; // US fallback
  
    // Query Supabase for a verified and owned number matching the prefix
    const { data, error } = await supabase
      .from("phone_numbers") 
      .select("phone_number")
      .eq("prefix", prefix)
      .eq("is_verified", true)
      .eq("is_ours", true)
      .single();
  
    if (error) {
      console.error("Supabase error:", error.message);
    }
  
    // Return the matching phone number or fallback to the default
    return data?.phone_number || defaultNumber;
  }