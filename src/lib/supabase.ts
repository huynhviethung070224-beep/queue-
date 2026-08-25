import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

let memberClient: SupabaseClient<Database> | null = null
let adminClient: SupabaseClient<Database> | null = null

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  )
}

function getPublicConfiguration() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
    )
  }

  return { url, anonKey }
}

function createBrowserClient(storageKey: string) {
  const { url, anonKey } = getPublicConfiguration()
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey,
    },
  })
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!memberClient) {
    memberClient = createBrowserClient('fairplay-member-auth')
  }
  return memberClient
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    adminClient = createBrowserClient('fairplay-admin-auth')
  }
  return adminClient
}
