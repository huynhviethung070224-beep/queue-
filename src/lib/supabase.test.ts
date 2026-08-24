import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient, isSupabaseConfigured } from './supabase'

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
})
