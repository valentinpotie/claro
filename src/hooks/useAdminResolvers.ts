import { useEffect, useMemo, useState } from "react";
import { USE_SUPABASE, supabase } from "@/lib/supabase";

export type AgencyLite = { id: string; name: string | null };
export type TicketLite = { id: string; reference: string | null; title: string | null; status: string | null; agency_id: string | null };

/** Cache-léger partagé par les pages admin : liste agences + 500 tickets récents
 *  avec lookup maps par id. Évite que chaque page refetch la même chose. */
export function useAdminResolvers() {
  const [agencies, setAgencies] = useState<AgencyLite[]>([]);
  const [tickets, setTickets] = useState<TicketLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!USE_SUPABASE) { setLoading(false); return; }
    void (async () => {
      const [{ data: ag }, { data: tk }] = await Promise.all([
        supabase.from("agencies").select("id, name").order("name"),
        supabase.from("tickets").select("id, reference, title, status, agency_id").order("created_at", { ascending: false }).limit(500),
      ]);
      setAgencies((ag ?? []) as AgencyLite[]);
      setTickets((tk ?? []) as TicketLite[]);
      setLoading(false);
    })();
  }, []);

  const agenciesById = useMemo(() => Object.fromEntries(agencies.map(a => [a.id, a])), [agencies]);
  const ticketsById = useMemo(() => Object.fromEntries(tickets.map(t => [t.id, t])), [tickets]);

  return { agencies, tickets, agenciesById, ticketsById, loading };
}
