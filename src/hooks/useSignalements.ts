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
        .select("id, agency_id, from_email, to_email, subject, body_text, body_html, received_at, status, validation_status, ticket_id, ai_suggestion, attachments")
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

  // (Previously a 3-second poll existed here as a safety net when the realtime UPDATE missed
  // the ai_suggestion population by inbound-email. It caused Supabase auth-lock contention
  // on page refresh — removed now that REPLICA IDENTITY FULL on inbound_emails guarantees
  // realtime delivers full rows. Manual refresh button on dashboard is the backup.)

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
          const id = (payload.new as { id?: string } | undefined)?.id;
          if (!id) return;
          // Re-fetch the row so JSONB fields (ai_suggestion) are properly parsed.
          void (async () => {
            const { data } = await supabase
              .from("inbound_emails")
              .select("id, agency_id, from_email, to_email, subject, body_text, body_html, received_at, status, validation_status, ticket_id, ai_suggestion, attachments")
              .eq("id", id)
              .single();
            if (!data) return;
            const row = data as InboundSignalement;
            if (row.validation_status === "pending" && !row.ticket_id) {
              setSignalements((prev) => {
                if (prev.some((s) => s.id === row.id)) return prev;
                return [row, ...prev];
              });
            }
          })();
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
          const id = (payload.new as { id?: string } | undefined)?.id;
          if (!id) return;
          // Re-fetch the row from DB instead of using payload.new directly:
          // JSONB columns (ai_suggestion) may be missing or mis-serialised in the
          // realtime payload when the update is made by a backend service.
          void (async () => {
            const { data } = await supabase
              .from("inbound_emails")
              .select("id, agency_id, from_email, to_email, subject, body_text, body_html, received_at, status, validation_status, ticket_id, ai_suggestion, attachments")
              .eq("id", id)
              .single();
            if (!data) {
              setSignalements((prev) => prev.filter((s) => s.id !== id));
              return;
            }
            const row = data as InboundSignalement;
            if (row.validation_status === "pending" && !row.ticket_id) {
              setSignalements((prev) => {
                const exists = prev.some((s) => s.id === row.id);
                if (exists) return prev.map((s) => (s.id === row.id ? row : s));
                return [row, ...prev];
              });
            } else {
              setSignalements((prev) => prev.filter((s) => s.id !== row.id));
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [agencyId]);

  const removeSignalement = useCallback((id: string) => {
    setSignalements((prev) => prev.filter((s) => s.id !== id));
    if (USE_SUPABASE && isUuid(id)) {
      // UPDATE rather than DELETE: avoids potential RLS gaps on DELETE and lets the
      // realtime UPDATE handler confirm the removal on all connected clients.
      void supabase
        .from("inbound_emails")
        .update({ validation_status: "rejected" })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to dismiss signalement", error);
        });
    }
  }, []);

  return { signalements, loading, refetch: fetchPending, removeSignalement };
}
