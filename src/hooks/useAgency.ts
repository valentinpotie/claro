import { useEffect, useState } from "react";
import { USE_SUPABASE } from "@/lib/supabase";
import { fetchAgencyBundle } from "@/lib/supabaseData";

export type AgencyBundle = Awaited<ReturnType<typeof fetchAgencyBundle>>;

type UseAgencyResult = {
  bundle: AgencyBundle | null;
  loading: boolean;
  error: string | null;
};

/**
 * Fetches the raw agency bundle from Supabase.
 * Merging with fallback/defaults is the caller's responsibility.
 * agencyId = null → auto-discovers the first available agency.
 */
export function useAgency(agencyId?: string | null): UseAgencyResult {
  const [bundle, setBundle] = useState<AgencyBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(USE_SUPABASE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAgencyBundle(agencyId)
      .then((result) => {
        if (!cancelled) {
          setBundle(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("useAgency: failed to fetch agency bundle", err);
          setError(err instanceof Error ? err.message : "Failed to load agency data");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agencyId]); // Only agencyId — no fallbackSettings to prevent infinite loops

  return { bundle, loading, error };
}
