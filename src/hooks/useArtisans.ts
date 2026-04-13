import { useEffect, useState } from "react";
import { initialArtisans } from "@/data/mockData";
import type { Artisan } from "@/data/types";
import { USE_SUPABASE } from "@/lib/supabase";
import { fetchArtisansByAgency } from "@/lib/supabaseData";

type UseArtisansResult = {
  artisans: Artisan[];
  loading: boolean;
};

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function useArtisans(agencyId?: string | null): UseArtisansResult {
  const [artisans, setArtisans] = useState<Artisan[]>(USE_SUPABASE ? [] : initialArtisans);
  const [loading, setLoading] = useState<boolean>(USE_SUPABASE);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setArtisans(initialArtisans);
      setLoading(false);
      return;
    }

    // No valid agency yet: keep local state empty and skip remote fetch.
    if (!isUuid(agencyId)) {
      setArtisans([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchArtisans() {
      setLoading(true);

      const data = await fetchArtisansByAgency(agencyId);

      if (cancelled) return;

      setArtisans(data);
      setLoading(false);
    }

    void fetchArtisans().catch(() => {
      if (!cancelled) {
        setArtisans([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  return { artisans, loading };
}
