import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Lazy-initialized para evitar error durante build de Next.js
let _supabase: SupabaseClient | null = null

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

// Mantener export para compatibilidad — se evalúa lazy en runtime
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Server-side only: bypasses RLS — NEVER expose to client
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
