import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Supabase renamed the browser key from "anon" to "publishable" (sb_publishable_...).
// Prefer the new name, fall back to the legacy anon key for compatibility.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to get user ID from session
export const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}