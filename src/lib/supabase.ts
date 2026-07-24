import { createBrowserClient, createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars")
}

let browserClient: SupabaseClient | null = null

export const createSupabaseBrowser = () => {
  if (browserClient) return browserClient
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}

export const createSupabaseServer = () => {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // No-op for API route usage
      },
    },
  })
}