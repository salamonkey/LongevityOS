import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const RUNTIME_STATE_KEY = String(import.meta.env.VITE_SUPABASE_STATE_KEY ?? 'default').trim() || 'default';
const TABLE_NAME = 'app_runtime_state';

let supabaseClient = null;

function normalizeStateKey(value) {
  const key = String(value ?? '').trim();
  return key || 'default';
}

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export function isSupabasePersistenceConfigured() {
  return Boolean(getSupabaseClient());
}

export async function loadAppRuntimeState(stateKey = RUNTIME_STATE_KEY) {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const key = normalizeStateKey(stateKey);
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('payload')
    .eq('state_key', key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const payload = data?.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload;
}

export async function saveAppRuntimeState(payload, stateKey = RUNTIME_STATE_KEY) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const key = normalizeStateKey(stateKey);
  const normalizedPayload = payload && typeof payload === 'object' ? payload : {};
  const { error } = await client
    .from(TABLE_NAME)
    .upsert({
      state_key: key,
      payload: normalizedPayload,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'state_key',
    });

  if (error) {
    throw error;
  }
}
