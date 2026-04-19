import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, USE_SUPABASE } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { Ticket } from "@/data/types";

/** Constante unique pour le "read" au niveau ticket (bannière + pill card). Les threads
 *  individuels utilisent leur propre threadKey ("locataire", "proprietaire", UUID
 *  artisan, etc.). Stocké en DB comme texte pour éviter NULLS NOT DISTINCT. */
export const GLOBAL_READ_KEY = "_global";

export type LatestEvent =
  | { type: "message"; at: string; label: string; threadKey: string }
  | { type: "status"; at: string; label: string }
  | { type: "document"; at: string; label: string; threadKey?: string };

type ReadRow = { thread_key: string; last_read_at: string };

/** État de lecture d'un ticket pour l'utilisateur courant.
 *  - isUnread : au moins un événement (inbound / statut / doc) postérieur au global read
 *  - threadUnread(key) : pastille pour cet onglet (inbound > max(global, thread))
 *  - latestEvents : 3 derniers événements depuis le global read, triés desc
 *  - markRead / markThreadRead : upsert dans ticket_read_state */
export function useTicketReadState(ticket: Ticket | undefined) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [rows, setRows] = useState<ReadRow[]>([]);
  /** Snapshot figé au premier fetch : sert de référence pour latestEvents et
   *  threadUnread. Évite que markRead (appelé à l'ouverture du ticket pour clear
   *  la pill liste) ne vide la bannière en live. Reset quand on change de ticket. */
  const [snapshotReadyForTicket, setSnapshotReadyForTicket] = useState<string | null>(null);
  const [snapshotRows, setSnapshotRows] = useState<ReadRow[]>([]);
  const userId = user?.id ?? null;
  const agencyId = settings.agency_id ?? null;
  const ticketId = ticket?.id ?? null;

  const fetch = useCallback(async () => {
    if (!USE_SUPABASE || !userId || !ticketId) { setRows([]); return; }
    const { data } = await supabase
      .from("ticket_read_state")
      .select("thread_key, last_read_at")
      .eq("user_id", userId)
      .eq("ticket_id", ticketId);
    const fetched = (data ?? []) as ReadRow[];
    setRows(fetched);
    // Premier fetch pour ce ticket → on fige le snapshot.
    setSnapshotReadyForTicket((prev) => {
      if (prev === ticketId) return prev;
      setSnapshotRows(fetched);
      return ticketId;
    });
  }, [userId, ticketId]);

  useEffect(() => {
    // Reset snapshot si on change de ticket
    setSnapshotReadyForTicket(null);
    setSnapshotRows([]);
    void fetch();
  }, [fetch]);

  /** Référence utilisée pour latestEvents + threadUnread : snapshot initial, pas
   *  les rows live (qui bougent après markRead). */
  const refGlobalReadAt = useMemo(() => {
    const row = snapshotRows.find((r) => r.thread_key === GLOBAL_READ_KEY);
    return row ? Date.parse(row.last_read_at) : 0;
  }, [snapshotRows]);

  const refThreadReadAtMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of snapshotRows) if (r.thread_key !== GLOBAL_READ_KEY) m.set(r.thread_key, Date.parse(r.last_read_at));
    return m;
  }, [snapshotRows]);

  /** Live : utilisé uniquement pour savoir s'il faut montrer la pastille d'un onglet
   *  après un markThreadRead individuel (onglet cliqué). */
  const liveThreadReadAtMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.thread_key !== GLOBAL_READ_KEY) m.set(r.thread_key, Date.parse(r.last_read_at));
    return m;
  }, [rows]);

  /** Dernier inbound par thread (timestamp ms). Pour l'onglet "artisans" on agrège les
   *  threads artisanId en un seul bucket. */
  const latestInboundByThread = useMemo(() => {
    const m = new Map<string, number>();
    if (!ticket) return m;
    for (const [threadKey, messages] of Object.entries(ticket.messages ?? {})) {
      for (const msg of messages) {
        if (msg.direction !== "inbound") continue;
        const t = Date.parse(msg.timestamp);
        const existing = m.get(threadKey) ?? 0;
        if (t > existing) m.set(threadKey, t);
      }
    }
    return m;
  }, [ticket]);

  /** Pastille onglet = inbound > max(snapshot_global, LIVE_thread_read).
   *  Utilise le snapshot pour le global (stable après l'auto-markRead d'ouverture) mais
   *  le live pour le thread (pour que cliquer un onglet clear sa propre pastille). */
  const threadUnread = useCallback((threadKey: string): boolean => {
    const latest = latestInboundByThread.get(threadKey) ?? 0;
    if (latest === 0) return false;
    const threadRead = liveThreadReadAtMap.get(threadKey) ?? refThreadReadAtMap.get(threadKey) ?? 0;
    const reference = Math.max(refGlobalReadAt, threadRead);
    return latest > reference;
  }, [latestInboundByThread, liveThreadReadAtMap, refThreadReadAtMap, refGlobalReadAt]);

  /** Pour l'onglet Artisans : true si AU MOINS un thread-artisan (UUID) a du unread. */
  const anyArtisanUnread = useCallback((): boolean => {
    for (const [threadKey, latest] of latestInboundByThread.entries()) {
      // Artisan thread = UUID (heuristique : contient un tiret sur la 9e position).
      if (!/^[0-9a-f]{8}-/i.test(threadKey)) continue;
      const threadRead = liveThreadReadAtMap.get(threadKey) ?? refThreadReadAtMap.get(threadKey) ?? 0;
      if (latest > Math.max(refGlobalReadAt, threadRead)) return true;
    }
    return false;
  }, [latestInboundByThread, liveThreadReadAtMap, refThreadReadAtMap, refGlobalReadAt]);

  const latestEvents = useMemo<LatestEvent[]>(() => {
    if (!ticket) return [];
    // Ne pas afficher de bannière tant que le snapshot n'est pas prêt — évite un flash
    // où on traite globalReadAt=0 et on affiche tous les messages historiques.
    if (snapshotReadyForTicket !== ticket.id) return [];
    const events: LatestEvent[] = [];
    for (const [threadKey, messages] of Object.entries(ticket.messages ?? {})) {
      for (const msg of messages) {
        if (msg.direction !== "inbound") continue;
        const t = Date.parse(msg.timestamp);
        if (t <= refGlobalReadAt) continue;
        const who = threadKey === "locataire" ? "Locataire"
          : threadKey === "proprietaire" ? "Propriétaire"
          : threadKey === "syndic" ? "Syndic"
          : threadKey === "assurance" ? "Assurance"
          : "Artisan";
        events.push({ type: "message", at: msg.timestamp, label: `Nouveau message — ${who}`, threadKey });
      }
    }
    for (const doc of ticket.documents ?? []) {
      if (!doc.ticket_message_id) continue;
      const t = Date.parse(doc.uploaded_at);
      if (t <= refGlobalReadAt) continue;
      const typeLabel = doc.document_type === "devis" ? "Devis" : doc.document_type === "facture" ? "Facture" : doc.document_type === "photo" ? "Photo" : "Document";
      events.push({ type: "document", at: doc.uploaded_at, label: `${typeLabel} reçu : ${doc.file_name}` });
    }
    if (ticket.lastActionAt && Date.parse(ticket.lastActionAt) > refGlobalReadAt && events.length === 0) {
      events.push({ type: "status", at: ticket.lastActionAt, label: `Mise à jour du ticket` });
    }
    events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return events.slice(0, 5);
  }, [ticket, refGlobalReadAt, snapshotReadyForTicket]);

  const isUnread = latestEvents.length > 0;

  const upsert = useCallback(async (threadKey: string) => {
    if (!USE_SUPABASE || !userId || !ticketId || !agencyId) return;
    const nowIso = new Date().toISOString();
    // Optimiste local d'abord
    setRows((prev) => {
      const filtered = prev.filter((r) => r.thread_key !== threadKey);
      return [...filtered, { thread_key: threadKey, last_read_at: nowIso }];
    });
    const { error } = await supabase
      .from("ticket_read_state")
      .upsert(
        { user_id: userId, ticket_id: ticketId, agency_id: agencyId, thread_key: threadKey, last_read_at: nowIso },
        { onConflict: "user_id,ticket_id,thread_key" },
      );
    if (error) {
      // Rollback silencieux : on laisse passer, prochain fetch alignera.
      console.error("ticket_read_state upsert failed", error);
    }
  }, [userId, ticketId, agencyId]);

  const markRead = useCallback(() => upsert(GLOBAL_READ_KEY), [upsert]);
  const markThreadRead = useCallback((threadKey: string) => upsert(threadKey), [upsert]);

  return { isUnread, threadUnread, anyArtisanUnread, latestEvents, markRead, markThreadRead, refetch: fetch };
}
