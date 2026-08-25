import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getSupabaseAdminClient,
  getSupabaseClient,
  isSupabaseConfigured,
} from './supabase'

describe('Supabase client foundation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('stays inactive and reports a clear error without public environment values', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    expect(isSupabaseConfigured()).toBe(false)
    expect(() => getSupabaseClient()).toThrow(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
    )
  })

  it('uses separate browser clients so admin login cannot replace member identity', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-test-key')

    expect(getSupabaseAdminClient()).not.toBe(getSupabaseClient())
  })
})
