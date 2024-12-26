import { supabase } from './supabase';

export async function getPhonePrefixes() {
  const { data, error } = await supabase
    .from('phone_prefixes')
    .select('prefix')
    .order('prefix');

  if (error) {
    console.error('Error fetching prefixes:', error);
    return ['+1']; // Fallback to US prefix
  }

  return data?.map(row => row.prefix) || ['+1'];
}

export async function savePhoneNumber(phoneNumber: string, prefix: string) {
  const body = JSON.stringify({
    phone: phoneNumber,
    prefix: prefix
  })
  
  const response = await fetch(import.meta.env.PUBLIC_SUPABASE_URL + '/functions/v1/save-phone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${import.meta.env.PUBLIC_SUPABASE_KEY}`
    },
    body: body
  });

  if (!response.ok) {
    if (response.status === 409) {
      const error = new Error('Phone number already exists');
      error.cause = 409;
      throw error;
    }
    throw new Error('Failed to save phone number');
  }

  return response.json();
} 
 