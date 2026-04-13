import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(url, key);

export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === "true";

// Optional: set VITE_AGENCY_ID in .env.local to pin a specific agency UUID.
// If not set, the app auto-discovers the first agency in the database.
export const CONFIGURED_AGENCY_ID: string | null =
  import.meta.env.VITE_AGENCY_ID ?? null;
