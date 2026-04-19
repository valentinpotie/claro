import { useEffect, useMemo, useState } from "react";
import { supabase, USE_SUPABASE } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { GLOBAL_READ_KEY } from "@/hooks/useTicketReadState";
import type { Ticket } from "@/data/types";

/** Pour la liste /tickets : calcule par ticket si l'utilisateur a du "non lu"
 *  (au moins un inbound ou un lastActionAt postérieur à son global read).
 *
 *  Pragmatique : une seule requête sur ticket_read_state scope user+tickets, comparaison
 *  client-side. Évite un JOIN SQL et garde la logique de dérivation unifiée avec
 *  useTicketReadState. */
export function useTicketsUnread(tickets: Ticket[]): Record<string, boolean> {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [readMap, setReadMap] = useState<Map<string, number>>(new Map());

  // Clé stable pour ne pas refetch à chaque re-render.
  const ticketIdsKey = useMemo(() => tickets.map((t) => t.id).sort().join(","), [tickets]);

  useEffect(() => {
    if (!USE_SUPABASE || !userId || tickets.length === 0) { setReadMap(new Map()); return; }
    const ids = tickets.map((t) => t.id);
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("ticket_read_state")
        .select("ticket_id, last_read_at")
        .eq("user_id", userId)
        .eq("thread_key", GLOBAL_READ_KEY)
        .in("ticket_id", ids);
      if (cancelled) return;
      const m = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ ticket_id: string; last_read_at: string }>) {
        m.set(row.ticket_id, Date.parse(row.last_read_at));
      }
      setReadMap(m);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ticketIdsKey]);

  return useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const t of tickets) {
      const readAt = readMap.get(t.id) ?? 0;
      // Dernier événement pertinent : max du dernier inbound + lastActionAt
      let latest = t.lastActionAt ? Date.parse(t.lastActionAt) : 0;
      for (const messages of Object.values(t.messages ?? {})) {
        for (const msg of messages) {
          if (msg.direction !== "inbound") continue;
          const ts = Date.parse(msg.timestamp);
          if (ts > latest) latest = ts;
        }
      }
      // Jamais ouvert : on considère unread SEULEMENT s'il y a un inbound (sinon c'est
      // juste un ticket fraîchement créé manuellement — la bannière serait du bruit).
      if (readAt === 0) {
        const hasInbound = Object.values(t.messages ?? {}).some((msgs) => msgs.some((m) => m.direction === "inbound"));
        out[t.id] = hasInbound;
      } else {
        out[t.id] = latest > readAt;
      }
    }
    return out;
  }, [tickets, readMap]);
}
