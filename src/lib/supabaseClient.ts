import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    '[LIS] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — auth and data ' +
      'requests will fail. See README "Configuration".',
  );
}

/**
 * The anon key is meant to ship in the client bundle — it identifies the
 * project, not a privileged credential. Row Level Security (see
 * supabase/schema.sql) is what actually decides what each signed-in user can
 * read or write, not secrecy of this key.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
