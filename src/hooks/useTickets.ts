import { useCallback, useEffect, useState } from "react";
import { initialTickets } from "@/data/mockData";
import type { Ticket } from "@/data/types";
import { USE_SUPABASE } from "@/lib/supabase";
import { fetchHydratedTickets } from "@/lib/supabaseData";

type UseTicketsResult = {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function useTickets(agencyId?: string | null): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>(USE_SUPABASE ? [] : initialTickets);
  const [loading, setLoading] = useState<boolean>(USE_SUPABASE);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!USE_SUPABASE) {
      setTickets(initialTickets);
      setLoading(false);
      setError(null);
      return;
    }

    // No valid agency yet: don't hit Supabase with an invalid filter value.
    if (!isUuid(agencyId)) {
      setTickets([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchHydratedTickets(agencyId);
      setTickets(result.tickets);
      setLoading(false);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Erreur Supabase";
      setError(message);
      setTickets([]);
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { tickets, loading, error, refetch };
}
