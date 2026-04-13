import { useCallback, useEffect, useState } from "react";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import type { InboundSignalement } from "@/data/types";

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Fetches pending inbound emails (signalements) from Supabase
 * and subscribes to realtime updates.
 */
export function useSignalements(agencyId?: string) {
  const [signalements, setSignalements] = useState<InboundSignalement[]>([]);
  const [loading, setLoading] = useState(USE_SUPABASE);

  const fetchPending = useCallback(async () => {
    if (!USE_SUPABASE || !isUuid(agencyId)) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("inbound_emails")
        .select("id, agency_id, from_email, to_email, subject, body_text, body_html, received_at, status, validation_status, ticket_id, ai_suggestion")
        .eq("agency_id", agencyId)
        .is("ticket_id", null)
        .eq("validation_status", "pending")
        .order("received_at", { ascending: false });

      if (error) {
        console.error("[useSignalements] fetch error", error.message);
        return;
      }

      setSignalements((data ?? []) as InboundSignalement[]);
    } catch (err) {
      console.error("[useSignalements] fetch exception", err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  // Initial fetch
  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  // Realtime subscription on inbound_emails
  useEffect(() => {
    if (!USE_SUPABASE || !isUuid(agencyId)) return;

    const channel = supabase
      .channel(`inbound_emails:${agencyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inbound_emails",
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          const row = payload.new as InboundSignalement | undefined;
          if (!row) return;
          // Only add if it's a pending signalement without a ticket
          if (row.validation_status === "pending" && !row.ticket_id) {
            setSignalements((prev) => {
              if (prev.some((s) => s.id === row.id)) return prev;
              return [row, ...prev];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inbound_emails",
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          const row = payload.new as InboundSignalement | undefined;
          if (!row) return;

          if (row.validation_status === "pending" && !row.ticket_id) {
            // Update or insert
            setSignalements((prev) => {
              const exists = prev.some((s) => s.id === row.id);
              if (exists) return prev.map((s) => (s.id === row.id ? row : s));
              return [row, ...prev];
            });
          } else {
            // No longer pending — remove from list
            setSignalements((prev) => prev.filter((s) => s.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [agencyId]);

  const removeSignalement = useCallback((id: string) => {
    setSignalements((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { signalements, loading, refetch: fetchPending, removeSignalement };
}
