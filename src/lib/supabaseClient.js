import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://coqfzlzcvvzclblbsuck.supabase.co";
const fallbackSupabaseAnonKey =
  "sb_publishable_O1qI4W1tlJhKRZHg-RtT9Q_PP1gHrzF";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});

export const LANDMARK_IMAGES_BUCKET = "landmark-images";
