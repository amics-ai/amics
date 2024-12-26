import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getPhonePrefixes() {
  const { data, error } = await supabase
    .from('phone_prefixes')
    .select('prefix')
    .order('prefix');

  if (error) {
    console.error('Error fetching phone prefixes:', error);
    return ['+1']; // Fallback to US prefix
  }

  return data.map(row => row.prefix);
} 