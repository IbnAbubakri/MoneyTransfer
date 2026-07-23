import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: SupabaseClient | null = null

export const createSupabaseBrowser = () => {
  if (browserClient) return browserClient
  browserClient = createClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}

export const createSupabaseServer = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}