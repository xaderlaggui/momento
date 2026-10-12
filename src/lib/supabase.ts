import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env."
  );
}

// PKCE keeps auth tokens out of the URL. The implicit flow (the default) put
// `#access_token=...&refresh_token=...` in the address bar after a magic link or
// Google redirect; PKCE exchanges a single-use `?code=` instead.
export const supabase = createClient(url, key, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
  },
});
export const BUCKET = "photos";
export const SHOTS_PER_ROLL = 20;
