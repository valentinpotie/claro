import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppLoader } from "@/components/AppLoader";
import { Ticket, Artisan, AIJournalEntry, Quote, TicketMessage, Responsabilite, TicketCategory, TicketPriority, TimeSlot, categoryLabels, InboundSignalement, TicketDocument, TicketDocumentType, SignalementAttachment } from "@/data/types";
import { initialTickets, initialArtisans } from "@/data/mockData";
import { useSettings } from "@/contexts/SettingsContext";
import { invokeSendTicketEmail, SendTicketEmailError } from "@/lib/ticketFunctions";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import { useTickets as useSupabaseTickets } from "@/hooks/useTickets";
import { useArtisans as useSupabaseArtisans } from "@/hooks/useArtisans";
import { useSignalements } from "@/hooks/useSignalements";
import {
  fetchHydratedTickets,
  fetchTicketJournalEntries,
  mapCategoryToDb,
  mapPriorityToDb,
  mapResponsabiliteToDb,
  mapStatusToDb,
  mapValidationToDb,
  toTicketCategory,
  toTicketPriority,
  toResponsabilite,
} from "@/lib/supabaseData";
import { toast } from "sonner";
import { getAutoMessageContent, buildTemplateVars } from "@/lib/templateUtils";

interface TicketContextType {
  tickets: Ticket[];
  artisans: Artisan[];
  journalEntries: AIJournalEntry[];
  showJournal: boolean;
  activeTicketId: string | null;
  loading: boolean;
  signalements: InboundSignalement[];
  signalementsLoading: boolean;
  removeSignalement: (id: string) => void;
  refetchSignalements: () => Promise<void>;
  setShowJournal: (v: boolean) => void;
  setActiveTicketId: (v: string | null) => void;
  createTicket: (data: { titre: string; description: string; categorie: TicketCategory; priorite: TicketPriority; urgence: boolean; locataireNom: string; locataireTel: string; locataireEmail: string; adresse: string; lot: string; proprietaire: string; telephoneProprio: string; emailProprio: string; tenant_id?: string; property_id?: string; owner_id?: string; mailSource?: { from: string; to: string; subject: string; body: string; receivedAt: string; attachments?: SignalementAttachment[] | null } }) => Ticket;
  updateTicket: (id: string, data: Partial<Ticket>) => void;
  qualifyTicket: (id: string) => void;
  sendArtisanContact: (ticketId: string, artisanId: string, overrideContent?: string, overrideSubject?: string, tenantAck?: { subject: string; content: string } | null) => void;
  receiveQuote: (ticketId: string) => void;
  /** Marks one of the received quotes as selected (when several artisans sent quotes). */
  selectQuote: (ticketId: string, quoteId: string) => void;
  validateQuote: (ticketId: string, quoteId?: string, ownerEmailOverride?: { subject: string; content: string; attachmentDocumentIds?: string[] }) => void;
  ownerRespond: (ticketId: string, approved: boolean, overrides?: { artisan?: { subject: string; content: string }; tenant?: { subject: string; content: string } }) => void;
  confirmPassage: (ticketId: string, confirmed: boolean) => void;
  advanceToFacturation: (ticketId: string) => void;
  validateFacture: (ticketId: string) => void;
  finalizeFacture: (ticketId: string) => void;
  sendFacturationAndClose: (ticketId: string, items: Array<{ threadKey: string; useCase: string; subject: string; content: string; attachmentDocumentIds: string[] }>) => Promise<void>;
  /** Manual Phase 1 relance — sends a short polite follow-up to the stakeholder's thread.
   *  Subject is auto-canonicalized by send-ticket-email so the mail threads into the same
   *  conversation in the recipient's inbox. No cap in Phase 1 — the gestionnaire decides. */
  relanceStakeholder: (ticketId: string, role: "owner" | "artisan" | "tenant") => Promise<void>;
  closeTicket: (ticketId: string) => void;
  contactSyndic: (ticketId: string) => void;
  relanceSyndic: (ticketId: string) => void;
  escaladeSyndic: (ticketId: string) => void;
  resolveSyndic: (ticketId: string) => void;
  addMessage: (ticketId: string, threadKey: string, content: string, from: "agence" | "artisan", subject?: string, templateId?: string) => void;
  fetchTicketMessages: (ticketId: string) => Promise<void>;
  addArtisan: (data: Omit<Artisan, "id">, overrideAgencyId?: string) => void;
  updateArtisan: (id: string, data: Partial<Omit<Artisan, "id">>) => void;
  removeArtisan: (id: string) => void;
  setDisponibilites: (ticketId: string, target: "artisan" | "locataire", slots: TimeSlot[]) => void;
  matchAndConfirm: (ticketId: string) => void;
  getTicket: (id: string) => Ticket | undefined;
  getArtisan: (id: string) => Artisan | undefined;
  validateSignalement: (signalement: InboundSignalement, overrides?: Partial<{ title: string; category: TicketCategory; priority: TicketPriority; responsibility: Responsabilite; description: string; urgent: boolean; tenantName: string; tenantPhone: string; tenantEmail: string; propertyAddress: string; propertyUnit: string; ownerName: string; ownerPhone: string; ownerEmail: string; tenant_id: string; property_id: string; owner_id: string }>) => Promise<Ticket>;
  fetchTicketDocuments: (ticketId: string) => Promise<void>;
  uploadTicketDocument: (ticketId: string, file: File, documentType: TicketDocumentType, description?: string) => Promise<TicketDocument>;
  updateTicketDocument: (ticketId: string, docId: string, patch: { description?: string; document_type?: TicketDocumentType; file_name?: string }) => Promise<void>;
  /** Re-fetch everything for a given ticket (row + messages + documents). Used by the manual "Rafraîchir" button. */
  refreshTicket: (ticketId: string) => Promise<void>;
  /** Refetch global (utilisé par le polling visibility-aware sur /dashboard). */
  refetchTickets: () => Promise<void>;
}

const TicketContext = createContext<TicketContextType | null>(null);

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be inside TicketProvider");
  return ctx;
}

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { first_name: "", last_name: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    first_name: firstName,
    last_name: rest.join(" "),
  };
}

/** Finds the active lease of a tenant (via lease_tenants) for a given agency. Returns
 *  null if no active lease — the caller inserts the ticket with lease_id = null. The UI
 *  can link it to a lease later via the Baux page. */
async function resolveActiveLeaseForTenant(
  tenantId: string,
  agencyId: string,
): Promise<{ id: string; external_ref: string | null } | null> {
  if (!USE_SUPABASE || !tenantId || !agencyId) return null;
  try {
    const { data: lts } = await supabase
      .from("lease_tenants")
      .select("lease_id")
      .eq("tenant_id", tenantId);
    const leaseIds = (lts ?? []).map((r) => r.lease_id).filter(Boolean);
    if (leaseIds.length === 0) return null;
    const { data: lease } = await supabase
      .from("leases")
      .select("id, external_ref")
      .eq("agency_id", agencyId)
      .eq("is_active", true)
      .in("id", leaseIds)
      .limit(1)
      .maybeSingle();
    return lease ?? null;
  } catch (e) {
    console.warn("resolveActiveLeaseForTenant failed", e);
    return null;
  }
}

function buildTicketPatch(data: Partial<Ticket>) {
  // updated_at + last_action_at are both bumped on every manual patch so the "Dernière
  // action : il y a Nj" chip and the Phase 2 reminder cron see the gestionnaire's activity.
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = { updated_at: now, last_action_at: now };

  if ("titre" in data) payload.title = data.titre;
  if ("description" in data) payload.description = data.description;
  if ("status" in data && data.status) payload.status = mapStatusToDb(data.status);
  if ("priorite" in data && data.priorite) payload.priority = mapPriorityToDb(data.priorite);
  if ("categorie" in data && data.categorie) payload.category = mapCategoryToDb(data.categorie);
  if ("urgence" in data) payload.is_urgent = data.urgence;
  if ("responsabilite" in data) payload.responsibility = mapResponsabiliteToDb(data.responsabilite);
  if ("validationStatus" in data) payload.validation_status = mapValidationToDb(data.validationStatus);
  if ("artisanId" in data) payload.assigned_artisan_id = data.artisanId ?? null;
  if ("selectedQuoteId" in data) payload.selected_quote_id = data.selectedQuoteId ?? null;
  if ("lease_id" in data) payload.lease_id = data.lease_id ?? null;
  if ("lease_ref" in data) payload.lease_ref = data.lease_ref ?? null;
  if ("reminders_sent_artisan" in data) payload.reminders_sent_artisan = data.reminders_sent_artisan ?? 0;
  if ("reminders_sent_owner" in data) payload.reminders_sent_owner = data.reminders_sent_owner ?? 0;
  if ("reminders_sent_tenant" in data) payload.reminders_sent_tenant = data.reminders_sent_tenant ?? 0;
  if ("reminder_paused_until" in data) payload.reminder_paused_until = data.reminder_paused_until ?? null;
  if ("requires_manual_action" in data) payload.requires_manual_action = data.requires_manual_action ?? false;
  if ("dateInterventionPrevue" in data) payload.planned_intervention_date = data.dateInterventionPrevue ?? null;
  if ("passageConfirme" in data) payload.passage_confirmed = data.passageConfirme ?? null;
  if ("factureValidee" in data) payload.invoice_validated = data.factureValidee ?? null;
  if ("locataire" in data && data.locataire) {
    payload.tenant_name  = data.locataire.nom   ?? null;
    payload.tenant_phone = data.locataire.telephone ?? null;
    payload.tenant_email = data.locataire.email ?? null;
  }
  if ("bien" in data && data.bien) {
    payload.property_address     = data.bien.adresse        ?? null;
    payload.property_unit        = data.bien.lot            ?? null;
    payload.property_owner_name  = data.bien.proprietaire   ?? null;
    payload.property_owner_phone = data.bien.telephoneProprio ?? null;
    payload.property_owner_email = data.bien.emailProprio   ?? null;
  }

  return payload;
}

function mergeJournalEntries(remoteEntries: AIJournalEntry[], localEntries: AIJournalEntry[]) {
  const pendingLocalEntries = localEntries.filter((entry) => entry.id.startsWith("local-") && entry.status !== "done");
  return [...remoteEntries, ...pendingLocalEntries];
}

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const { settings, needsOwnerApproval, loading: settingsLoading } = useSettings();
  const { tickets: fetchedTickets, loading: ticketsLoading, error: ticketsError, refetch: refetchTickets } = useSupabaseTickets(
    USE_SUPABASE ? settings.agency_id : undefined,
  );
  const { artisans: fetchedArtisans, loading: artisansLoading } = useSupabaseArtisans(
    USE_SUPABASE ? settings.agency_id : undefined,
  );
  const { signalements, loading: signalementsLoading, removeSignalement, refetch: refetchSignalements } = useSignalements(
    USE_SUPABASE ? settings.agency_id : undefined,
  );
  const [tickets, setTickets] = useState<Ticket[]>(USE_SUPABASE ? [] : initialTickets);
  const [artisans, setArtisans] = useState<Artisan[]>(USE_SUPABASE ? [] : initialArtisans);
  const [journalEntries, setJournalEntries] = useState<AIJournalEntry[]>([]);
  const [showJournal, setShowJournal] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!USE_SUPABASE);
  const loading = USE_SUPABASE ? settingsLoading || ticketsLoading || artisansLoading : false;
  const ticketsRef = useRef<Ticket[]>(USE_SUPABASE ? [] : initialTickets);
  // Always-current agency_id — avoids stale closure when agency_id changes (e.g. onboarding completion).
  const agencyIdRef = useRef(settings.agency_id);
  agencyIdRef.current = settings.agency_id;
  // Late-binding refs for fetch* helpers (defined further down). Lets the realtime
  // subscription effect wire up without a temporal-dead-zone issue.
  const fetchTicketMessagesRef = useRef<((ticketId: string) => Promise<void>) | null>(null);
  const fetchTicketDocumentsRef = useRef<((ticketId: string) => Promise<void>) | null>(null);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  const fetchTicketsOnce = useCallback(() => {
    if (!USE_SUPABASE || ticketsRef.current.length > 0) return;
    setTickets(fetchedTickets);
  }, [USE_SUPABASE, fetchedTickets]);

  useEffect(() => {
    fetchTicketsOnce();
  }, [fetchTicketsOnce]);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setHydrated(true);
      return;
    }

    if (!loading) {
      // Preserve locally-loaded signed-URL documents — fetchHydratedTickets always returns documents: []
      setTickets((prev) =>
        fetchedTickets.map((t) => {
          const existing = prev.find((p) => p.id === t.id);
          return existing?.documents?.length ? { ...t, documents: existing.documents } : t;
        }),
      );
      setArtisans(fetchedArtisans);
      setHydrated(true);
    }

    if (ticketsError) {
      console.error("Error fetching tickets", ticketsError);
      setHydrated(true); // Don't block UI on fetch errors
    }
  }, [USE_SUPABASE, loading, fetchedTickets, fetchedArtisans, ticketsError]);

  useEffect(() => {
    if (!USE_SUPABASE || fetchedTickets.length === 0) {
      if (!USE_SUPABASE) setJournalEntries([]);
      return;
    }

    let cancelled = false;

    async function hydrateJournal() {
      const remoteEntries = await fetchTicketJournalEntries(fetchedTickets.map((ticket) => ticket.id));
      if (cancelled) return;
      setJournalEntries((prev) => mergeJournalEntries(remoteEntries, prev));
    }

    void hydrateJournal().catch((error) => {
      console.error("Failed to hydrate journal entries", error);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchedTickets]);

  useEffect(() => {
    if (!USE_SUPABASE || !isUuid(settings.agency_id)) return;

    const channel = supabase
      .channel(`tickets:${settings.agency_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: `agency_id=eq.${settings.agency_id}`,
        },
        (payload) => {
          const insertedId = payload.new?.id as string | undefined;
          if (!insertedId) return;
          void (async () => {
            try {
              const result = await fetchHydratedTickets(settings.agency_id);
              const insertedTicket = result.tickets.find((ticket) => ticket.id === insertedId);
              if (!insertedTicket) return;
              let wasInserted = false;
              setTickets((prev) => {
                if (prev.some((ticket) => ticket.id === insertedTicket.id)) return prev;
                wasInserted = true;
                return [insertedTicket, ...prev];
              });
              if (wasInserted) {
                toast("Nouveau signalement recu", {
                  description: insertedTicket.titre,
                });
              }
            } catch (error) {
              console.error("Failed to hydrate inserted ticket", error);
            }
          })();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `agency_id=eq.${settings.agency_id}`,
        },
        (payload) => {
          const updatedId = payload.new?.id as string | undefined;
          if (!updatedId) return;
          void (async () => {
            try {
              const result = await fetchHydratedTickets(settings.agency_id);
              const updatedTicket = result.tickets.find((ticket) => ticket.id === updatedId);
              if (!updatedTicket) return;
              setTickets((prev) =>
                prev.map((ticket) => {
                  if (ticket.id !== updatedTicket.id) return ticket;
                  // Preserve locally-loaded signed-URL documents — fetchHydratedTickets always returns documents: []
                  return updatedTicket.documents?.length
                    ? updatedTicket
                    : { ...updatedTicket, documents: ticket.documents };
                }),
              );
            } catch (error) {
              console.error("Failed to hydrate updated ticket", error);
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [settings.agency_id]);

  // Realtime sur ticket_messages: permet d'afficher les réponses traitées par classify-reply
  // sans que l'utilisateur doive refresh. On ne filtre pas côté DB (pas de filter sur agency_id
  // pour cette table) — on filtre côté client en ne réagissant qu'aux tickets qu'on connaît.
  useEffect(() => {
    if (!USE_SUPABASE) return;

    const channel = supabase
      .channel("ticket_messages_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        (payload) => {
          const ticketId = (payload.new as { ticket_id?: string } | undefined)?.ticket_id;
          if (!ticketId) return;
          if (!ticketsRef.current.some((t) => t.id === ticketId)) return;
          void fetchTicketMessagesRef.current?.(ticketId);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_documents" },
        (payload) => {
          const ticketId = (payload.new as { ticket_id?: string } | undefined)?.ticket_id;
          if (!ticketId) return;
          if (!ticketsRef.current.some((t) => t.id === ticketId)) return;
          // Re-fetch documents so signed URLs are regenerated and JSONB is properly parsed
          void fetchTicketDocumentsRef.current?.(ticketId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const persistJournalEntry = useCallback(async (ticketId: string, action: { msg: string; type: AIJournalEntry["type"] }) => {
    if (!USE_SUPABASE) return;
    // Don't attempt DB writes with local placeholder IDs — they're not valid UUIDs.
    if (ticketId.startsWith("local-")) return;
    try {
      await supabase.from("ticket_journal_entries").insert({
        ticket_id: ticketId,
        type: action.type,
        status: "done",
        message: action.msg,
        triggered_by: "ai",
        occurred_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to persist journal entry", error);
      setJournalEntries((prev) =>
        prev.map((entry) =>
          entry.ticketId === ticketId && entry.message === action.msg
            ? { ...entry, status: "failed" }
            : entry
        )
      );
    }
  }, []);

  const syncTicketPatch = useCallback(async (id: string, data: Partial<Ticket>) => {
    if (!USE_SUPABASE) return;
    // Don't attempt DB writes with local placeholder IDs — they're not valid UUIDs.
    if (id.startsWith("local-")) return;

    const payload = buildTicketPatch(data);
    if (Object.keys(payload).length > 1) {
      await supabase.from("tickets").update(payload).eq("id", id);
    }

    if ("mailSource" in data && data.mailSource) {
      await supabase.from("ticket_mail_sources").upsert(
        {
          ticket_id: id,
          from_email: data.mailSource.from,
          to_email: data.mailSource.to,
          subject: data.mailSource.subject,
          body: data.mailSource.body,
          received_at: data.mailSource.receivedAt,
          attachments: data.mailSource.attachments ?? null,
        },
        { onConflict: "ticket_id" },
      );
    }

    if ("facture" in data && data.facture) {
      const currentTicket = ticketsRef.current.find((ticket) => ticket.id === id);
      await supabase.from("ticket_invoices").upsert(
        {
          ticket_id: id,
          artisan_id: currentTicket?.artisanId ?? null,
          amount: data.facture.montant,
          is_paid: data.facture.payee,
          invoice_ref: data.facture.refFacture ?? null,
          invoice_date: data.facture.dateFacture ?? null,
          description: data.facture.prestation ?? null,
        },
        { onConflict: "ticket_id" },
      );
    }
  }, []);

  const refreshRemoteTickets = useCallback(() => {
    if (!USE_SUPABASE) return;
    void refetchTickets().catch((error) => {
      console.error("Failed to refetch tickets", error);
    });
  }, [refetchTickets]);

  const simulateAI = useCallback((ticketId: string, actions: { msg: string; type: AIJournalEntry["type"] }[], onComplete?: () => void) => {
    setActiveTicketId(ticketId);
    actions.forEach((action, i) => {
      const entryId = `local-${Date.now()}-${ticketId}-${i}`;
      setTimeout(() => {
        setJournalEntries(prev => [...prev, {
          id: entryId, ticketId, timestamp: new Date().toISOString(),
          message: action.msg, type: action.type, status: "in_progress",
        }]);
        setTimeout(() => {
          setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "done" } : e));
          void persistJournalEntry(ticketId, action).catch((error) => {
            console.error("Failed to persist journal entry", error);
          });
          if (i === actions.length - 1 && onComplete) setTimeout(onComplete, 400);
        }, 800);
      }, i * 1200);
    });
  }, [persistJournalEntry]);

  const update = useCallback((id: string, data: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data, dateMaj: new Date().toISOString().slice(0, 10) } : t));
  }, []);

  /** Resolves the content of an automated message using the agency's customised template when available. */
  const autoContent = useCallback((useCase: string, ticket: Ticket, artisan: Artisan | null | undefined, fallback: string) => {
    const vars = buildTemplateVars(ticket, artisan, settings.agency_name);
    return getAutoMessageContent(settings.email_templates ?? [], useCase, vars, fallback);
  }, [settings.email_templates, settings.agency_name]);

  /** Adds an outbound automated message to local state and persists it to DB. */
  const persistOutboundMessage = useCallback((ticketId: string, threadKey: string, content: string) => {
    const msg: TicketMessage = {
      id: `msg-auto-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from: "agence",
      content,
      timestamp: new Date().toISOString(),
    };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t, messages: { ...t.messages, [threadKey]: [...(t.messages[threadKey] || []), msg] }
    } : t));
    void (async () => {
      if (!USE_SUPABASE) return;
      if (ticketId.startsWith("local-")) return;
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadKey);
        const recipientTypeMap: Record<string, string> = {
          locataire: "tenant", proprietaire: "owner", syndic: "syndic", assurance: "insurance",
        };
        await supabase.from("ticket_messages").insert({
          ticket_id: ticketId,
          artisan_id: isUuid ? threadKey : null,
          recipient_type: isUuid ? "artisan" : (recipientTypeMap[threadKey] ?? threadKey),
          from_role: "agency",
          content,
          sent_at: msg.timestamp,
        });
      } catch (error) {
        console.error("Failed to persist automated message", error);
      }
    })();
  }, []);

  /**
   * Dispatcher pour tous les emails sortants automatiques.
   * - demo_mode=true  → persistOutboundMessage (local + ticket_messages, pas d'envoi réel)
   * - demo_mode=false → invokeSendTicketEmail (edge function envoie via Resend + insert ticket_messages)
   *
   * threadKey peut être "locataire"/"proprietaire"/"syndic" ou un UUID d'artisan.
   * useCase = clé template email (ex "auto:artisan_devis_valide"), utilisée côté edge function
   * pour pull le template de l'agence. fallback* utilisés si le template n'existe pas.
   */
  /**
   * Dispatcher pour les emails sortants. Retourne une Promise pour permettre aux callers
   * multi-emails (validateFacture, etc.) d'orchestrer via Promise.allSettled et de détecter
   * les échecs partiels (2/3 envoyés, 1 failed).
   *
   * Fire-and-forget compatible : les callers single-email ignorent simplement la Promise.
   * Un toast d'erreur est affiché automatiquement en cas d'échec individuel.
   */
  const dispatchOutbound = useCallback(async (params: {
    ticketId: string;
    threadKey: string;
    useCase: string;
    fallbackSubject: string;
    fallbackContent: string;
    correlationId?: string; // shared id across a batch → /debug/logs groups them
    attachmentDocumentIds?: string[]; // ticket_documents ids attached to the email (owner approval etc.)
    /** Override email pour recipient_type="custom" (comptable, adresse libre).
     *  Si présent, threadKey sert uniquement de clé locale — pas utilisé pour résoudre
     *  un tenant/owner/artisan. */
    overrideEmail?: string;
    overrideName?: string;
    overrideRoleTag?: string;
  }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { ticketId, threadKey, useCase, fallbackSubject, fallbackContent, correlationId, attachmentDocumentIds, overrideEmail, overrideName, overrideRoleTag } = params;

    const isArtisanUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadKey);
    const recipientType: "artisan" | "locataire" | "proprietaire" | "syndic" | "custom" =
      overrideEmail ? "custom" :
      isArtisanUuid ? "artisan" :
      threadKey === "locataire" ? "locataire" :
      threadKey === "proprietaire" ? "proprietaire" :
      threadKey === "syndic" ? "syndic" : "locataire";
    const artisanId = isArtisanUuid ? threadKey : undefined;

    if (!settings.demo_mode && USE_SUPABASE && !ticketId.startsWith("local-")) {
      try {
        const res = await invokeSendTicketEmail({
          ticket_id: ticketId,
          recipient_type: recipientType,
          artisan_id: artisanId,
          template_use_case: useCase,
          fallback_content: fallbackContent,
          fallback_subject: fallbackSubject,
          correlation_id: correlationId,
          attachment_document_ids: attachmentDocumentIds,
          override_email: overrideEmail,
          override_name: overrideName,
          override_role_tag: overrideRoleTag,
        });
        await fetchTicketMessagesRef.current?.(ticketId);
        // Partial failure: email sent but local DB insert of ticket_messages failed.
        // Surface it so the gestionnaire knows the thread may not reflect the send.
        if (res.message_logged === false && !correlationId) {
          toast.warning("Email envoyé mais non enregistré dans la discussion", {
            description: `Le mail est parti chez le destinataire. Erreur locale : ${res.message_log_error ?? "inconnue"}. Log : ${res.correlation_id.slice(0, 8)}`,
            duration: 10000,
          });
        }
        return { ok: true };
      } catch (err) {
        const msg = err instanceof SendTicketEmailError ? err.message : err instanceof Error ? err.message : String(err);
        console.error("dispatchOutbound failed", { useCase, threadKey, err });
        // Only toast here if it's NOT part of a batch — batch callers show an aggregate toast
        if (!correlationId) {
          toast.error(`Échec envoi email (${useCase})`, { description: msg });
        }
        return { ok: false, error: msg };
      }
    }

    // Demo mode: local + ticket_messages (no real email)
    persistOutboundMessage(ticketId, threadKey, fallbackContent);
    return { ok: true };
  }, [settings.demo_mode, persistOutboundMessage]);

  /**
   * Envoie plusieurs emails en parallèle, reporte un résumé clair à l'utilisateur
   * ("2/3 envoyés"), et logue dans function_logs via un correlation_id partagé pour
   * que /debug/logs groupe tout sous un même plier. Aucun rollback possible (Resend
   * ne supporte pas les transactions), mais le gestionnaire sait exactement ce qui
   * est passé et ce qui a raté.
   */
  const dispatchOutboundBatch = useCallback(async (
    label: string,
    items: Array<{ ticketId: string; threadKey: string; useCase: string; fallbackSubject: string; fallbackContent: string; attachmentDocumentIds?: string[]; overrideEmail?: string; overrideName?: string; overrideRoleTag?: string }>,
  ): Promise<{ sent: number; failed: number }> => {
    if (items.length === 0) return { sent: 0, failed: 0 };
    const correlationId = crypto.randomUUID();
    const results = await Promise.all(items.map((item) => dispatchOutbound({ ...item, correlationId })));
    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    if (failed > 0 && !settings.demo_mode) {
      toast.warning(`${label} : ${sent}/${items.length} emails envoyés`, {
        description: `${failed} email${failed > 1 ? "s" : ""} en échec. Log : ${correlationId.slice(0, 8)} (visible sur /debug/logs).`,
        duration: 12000,
      });
    }
    return { sent, failed };
  }, [dispatchOutbound, settings.demo_mode]);

  const createTicket = (data: { titre: string; description: string; categorie: TicketCategory; priorite: TicketPriority; urgence: boolean; locataireNom: string; locataireTel: string; locataireEmail: string; adresse: string; lot: string; proprietaire: string; telephoneProprio: string; emailProprio: string; tenant_id?: string; property_id?: string; owner_id?: string; mailSource?: { from: string; to: string; subject: string; body: string; receivedAt: string; attachments?: SignalementAttachment[] | null } }) => {
    const now = new Date().toISOString();
    const newTicket: Ticket = {
      id: `local-${Date.now()}`,
      reference: "CLR-...",
      source: data.mailSource ? "email" : "manual",
      titre: data.titre,
      description: data.description,
      status: "signale",
      priorite: data.priorite,
      categorie: data.categorie,
      dateCreation: now,
      dateMaj: now,
      urgence: data.urgence,
      locataire: { nom: data.locataireNom, telephone: data.locataireTel, email: data.locataireEmail },
      bien: { adresse: data.adresse, lot: data.lot, proprietaire: data.proprietaire, telephoneProprio: data.telephoneProprio, emailProprio: data.emailProprio },
      tenant_id: data.tenant_id,
      property_id: data.property_id,
      owner_id: data.owner_id,
      quotes: [],
      messages: {},
      photos: [],
      documents: [],
      notes: [],
      disponibilitesArtisan: [],
      disponibilitesLocataire: [],
      mailSource: data.mailSource,
    };
    setTickets((prev) => [newTicket, ...prev]);

    if (USE_SUPABASE) {
      const agencyId = settings.agency_id;
      const isValidAgency = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(agencyId);
      const { first_name, last_name } = splitFullName(data.locataireNom);

      void (async () => {
        try {
          // Resolve active lease for the tenant so the ticket is tied to the lease at creation
          // time. Best-effort : if no active lease is found, we insert lease_id = null.
          const activeLease = data.tenant_id && isValidAgency
            ? await resolveActiveLeaseForTenant(data.tenant_id, agencyId)
            : null;

          const dbPayload = {
            agency_id: isValidAgency ? agencyId : null,
            source: data.mailSource ? "email" : "manual",
            title: data.titre,
            description: data.description,
            status: mapStatusToDb("signale"),
            priority: mapPriorityToDb(data.priorite),
            category: mapCategoryToDb(data.categorie),
            is_urgent: data.urgence,
            tenant_name: `${first_name} ${last_name}`.trim() || null,
            tenant_phone: data.locataireTel || null,
            tenant_email: data.locataireEmail || null,
            property_address: data.adresse || null,
            property_unit: data.lot || null,
            property_owner_name: data.proprietaire || null,
            property_owner_phone: data.telephoneProprio || null,
            property_owner_email: data.emailProprio || null,
            tenant_id: data.tenant_id || null,
            property_id: data.property_id || null,
            owner_id: data.owner_id || null,
            lease_id: activeLease?.id ?? null,
            lease_ref: activeLease?.external_ref ?? null,
          };

          const { data: inserted, error } = await supabase.from("tickets").insert(dbPayload).select("id, reference").single();
          if (error) {
            console.error("Ticket insert failed", error);
            return;
          }
          // Replace local placeholder id with the real DB id
          setTickets((prev) => prev.map((t) => (t.id === newTicket.id ? { ...t, id: inserted.id, reference: inserted.reference ?? t.reference } : t)));

          if (data.mailSource) {
            await supabase.from("ticket_mail_sources").insert({
              ticket_id: inserted.id,
              from_email: data.mailSource.from,
              to_email: data.mailSource.to,
              subject: data.mailSource.subject,
              body: data.mailSource.body,
              received_at: data.mailSource.receivedAt,
              attachments: data.mailSource.attachments ?? null,
            });
          }
        } catch (err) {
          console.error("Ticket creation error", err);
        }
      })();
    }

    return newTicket;
  };

  const qualifyTicket = useCallback((id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const isSyndic = ticket.responsabilite === "syndic" || ticket.syndic != null;
    const resp = isSyndic ? "syndic" : (ticket.categorie === "autre" ? "partagee" : (["plomberie", "electricite", "chauffage", "toiture", "humidite"].includes(ticket.categorie) ? "proprietaire" : "locataire"));
    const nextStatus = resp === "syndic" ? "contact_syndic" : "contact_artisan";
    const nextResp: Responsabilite = resp === "syndic" ? "syndic" : (resp as Responsabilite);

    // En prod, inbound-email qualifie déjà le signalement via Claude à l'ingestion :
    // pas de fausse analyse simulée au chargement du ticket. Transition immédiate vers
    // contact_artisan (ou contact_syndic) pour que la liste des artisans s'affiche sans
    // délai artificiel.
    if (!settings.demo_mode) {
      update(id, { status: nextStatus, responsabilite: nextResp });
      void syncTicketPatch(id, { status: nextStatus, responsabilite: nextResp }).catch((error) => {
        console.error("Failed to sync ticket qualification", error);
      });
      return;
    }

    // Mode démo : garde l'animation d'analyse pour la présentation commerciale.
    if (resp === "syndic") {
      simulateAI(id, [
        { msg: "Analyse du signalement en cours…", type: "analysis" },
        { msg: `Description analysée : "${ticket.description.slice(0, 60)}…"`, type: "analysis" },
        { msg: "Parties communes détectées → Responsabilité : Syndic", type: "analysis" },
        { msg: `Syndic identifié : ${ticket.syndic?.nom || "À renseigner"}`, type: "analysis" },
        { msg: "Diagnostic terminé → Parcours Syndic activé", type: "action" },
        { msg: "Passage à l'étape Contact syndic", type: "action" },
      ], () => {
        update(id, { status: "contact_syndic", responsabilite: "syndic" });
        void syncTicketPatch(id, { status: "contact_syndic", responsabilite: "syndic" }).catch((error) => {
          console.error("Failed to sync ticket qualification", error);
        });
      });
    } else {
      simulateAI(id, [
        { msg: "Analyse du signalement en cours…", type: "analysis" },
        { msg: `Description analysée : "${ticket.description.slice(0, 60)}…"`, type: "analysis" },
        { msg: `Catégorie détectée : ${ticket.categorie}`, type: "analysis" },
        { msg: `Analyse de responsabilité : ${resp === "proprietaire" ? "Propriétaire" : resp === "locataire" ? "Locataire" : "Partagée"}`, type: "analysis" },
        { msg: "Diagnostic terminé → Orientation : Réparation/Entretien", type: "action" },
        { msg: "Passage à l'étape Contact artisan", type: "action" },
      ], () => {
        update(id, { status: "contact_artisan", responsabilite: resp as Responsabilite });
        void syncTicketPatch(id, { status: "contact_artisan", responsabilite: resp as Responsabilite }).catch((error) => {
          console.error("Failed to sync ticket qualification", error);
        });
      });
    }
  }, [tickets, simulateAI, syncTicketPatch, update, settings.demo_mode]);

  const sendArtisanContact = useCallback((ticketId: string, artisanId: string, overrideContent?: string, overrideSubject?: string, tenantAck?: { subject: string; content: string } | null) => {
    const artisan = artisans.find(a => a.id === artisanId);
    const ticket = tickets.find(t => t.id === ticketId);
    if (!artisan || !ticket) return;
    const defaultContent = `Bonjour ${artisan.nom},\n\nNous avons un problème de ${ticket.categorie} au ${ticket.bien.adresse}.\n\nCoordonnées du locataire :\n- Nom : ${ticket.locataire.nom}\n- Téléphone : ${ticket.locataire.telephone}\n- Email : ${ticket.locataire.email}\n\nCoordonnées du propriétaire :\n- Nom : ${ticket.bien.proprietaire}\n- Téléphone : ${ticket.bien.telephoneProprio}\n- Email : ${ticket.bien.emailProprio}\n\nPouvez-vous vous déplacer pour faire un diagnostic sur place ?\n\nMerci.`;
    const defaultSubject = overrideSubject ?? `Demande d'intervention — ${ticket.bien.adresse}`;

    if (!settings.demo_mode && USE_SUPABASE && !ticketId.startsWith("local-")) {
      // === Production: real email via edge function ===
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, artisanId } : t));
      void (async () => {
        try {
          await syncTicketPatch(ticketId, { artisanId });
          const items: Array<{ ticketId: string; threadKey: string; useCase: string; fallbackSubject: string; fallbackContent: string }> = [{
            ticketId, threadKey: artisanId, useCase: "auto:artisan_demande_devis",
            fallbackSubject: defaultSubject,
            fallbackContent: overrideContent ?? defaultContent,
          }];
          if (tenantAck) {
            items.push({
              ticketId, threadKey: "locataire", useCase: "auto:locataire_signalement_recu",
              fallbackSubject: tenantAck.subject,
              fallbackContent: tenantAck.content,
            });
          }
          const result = await dispatchOutboundBatch("Contact artisan", items);
          if (result.sent > 0) {
            toast.success(tenantAck ? `Emails envoyés (${result.sent}/${items.length})` : `Email envoyé à ${artisan.nom}`);
          }
          simulateAI(ticketId, [
            { msg: `Email envoyé à ${artisan.nom} (${artisan.email})`, type: "message_sent" },
            ...(tenantAck ? [{ msg: `Accusé de réception envoyé à ${ticket.locataire.nom}`, type: "message_sent" as const }] : []),
            { msg: "En attente du devis par email…", type: "notification" },
          ]);
        } catch (err) {
          const msg = err instanceof SendTicketEmailError ? err.message : err instanceof Error ? err.message : String(err);
          console.error("sendArtisanContact (prod) failed", err);
          toast.error("Échec de l'envoi", { description: msg });
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, artisanId: ticket.artisanId } : t));
        }
      })();
      return;
    }

    // === Demo mode: fake everything client-side (behavior inchangé) ===
    const msg: TicketMessage = {
      id: `msg-${Date.now()}`, from: "agence",
      content: overrideContent ?? defaultContent,
      subject: overrideSubject,
      timestamp: new Date().toISOString(),
    };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t,
      artisanId: artisanId,
      messages: { ...t.messages, [artisanId]: [...(t.messages[artisanId] || []), msg] }
    } : t));
    void (async () => {
      if (!USE_SUPABASE) return;
      if (ticketId.startsWith("local-")) return;
      try {
        await syncTicketPatch(ticketId, { artisanId });
        await supabase.from("ticket_messages").insert({
          ticket_id: ticketId,
          artisan_id: artisanId,
          recipient_type: "artisan",
          from_role: "agency",
          content: msg.content,
          subject: msg.subject ?? null,
          sent_at: msg.timestamp,
        });
      } catch (error) {
        console.error("Failed to persist artisan contact", error);
      }
    })();
    simulateAI(ticketId, [
      { msg: `Email envoyé à ${artisan.nom} (${artisan.email})`, type: "message_sent" },
      { msg: `Demande de déplacement pour diagnostic : ${ticket.titre}`, type: "message_sent" },
    ]);

    // Simulate artisan response after 3 seconds (demo only)
    setTimeout(() => {
      const replyMsg: TicketMessage = {
        id: `msg-${Date.now()}-reply`, from: "artisan",
        content: `Bonjour, suite à votre demande, je peux me déplacer pour un diagnostic au ${ticket.bien.adresse}.\n\nJe suis disponible demain matin. Je vous enverrai mon devis après le diagnostic sur place.\n\nCordialement,\n${artisan.nom}`,
        timestamp: new Date().toISOString(),
      };
      setTickets(prev => prev.map(t => t.id === ticketId ? {
        ...t, messages: { ...t.messages, [artisanId]: [...(t.messages[artisanId] || []), replyMsg] }
      } : t));
      void (async () => {
        if (!USE_SUPABASE) return;
        if (ticketId.startsWith("local-")) return;
        try {
          await supabase.from("ticket_messages").insert({
            ticket_id: ticketId,
            artisan_id: artisanId,
            from_role: "artisan",
            content: replyMsg.content,
            sent_at: replyMsg.timestamp,
          });
        } catch (error) {
          console.error("Failed to persist artisan reply", error);
        }
      })();
      simulateAI(ticketId, [
        { msg: `📩 Réponse reçue de ${artisan.nom}`, type: "notification" },
        { msg: `L'artisan accepte de se déplacer pour un diagnostic sur place`, type: "notification" },
        { msg: "En attente du devis après diagnostic…", type: "notification" },
      ]);
    }, 3000);
  }, [artisans, tickets, simulateAI, syncTicketPatch, settings.demo_mode, settings.email_inbound, dispatchOutboundBatch]);

  const receiveQuote = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || !ticket.artisanId) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    if (!artisan) return;
    const montant = Math.floor(200 + Math.random() * 600);
    const delais = ["2 jours", "3 jours", "5 jours", "1 semaine"];
    const delai = delais[Math.floor(Math.random() * delais.length)];
    const quote: Quote = { id: `q-${Date.now()}`, artisanId: ticket.artisanId, artisanNom: artisan.nom, montant, delai, description: `${categoryLabels[ticket.categorie]} — ${ticket.bien.adresse}`, selected: true };
    const replyMsg: TicketMessage = {
      id: `msg-${Date.now()}-devis`, from: "artisan",
      content: `Bonjour, suite à mon passage sur place, voici mon devis pour les travaux au ${ticket.bien.adresse}.\n\nMontant : ${montant} €\nDélai estimé : ${delai}\n\n📎 Devis_${artisan.nom.replace(/\s/g, "_")}_${ticket.reference}.pdf\n\nCordialement,\n${artisan.nom}`,
      timestamp: new Date().toISOString(),
    };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t,
      status: "reception_devis" as const,
      quotes: [quote],
      selectedQuoteId: quote.id,
      messages: { ...t.messages, [ticket.artisanId!]: [...(t.messages[ticket.artisanId!] || []), replyMsg] }
    } : t));
    void (async () => {
      if (!USE_SUPABASE) return;
      if (ticketId.startsWith("local-")) return;
      try {
        const { data: insertedQuote, error: quoteError } = await supabase.from("ticket_quotes").insert({
          ticket_id: ticketId,
          artisan_id: ticket.artisanId,
          artisan_name_snapshot: artisan.nom,
          amount: montant,
          delay_text: delai,
          description: quote.description,
          is_selected: true,
        }).select("id").single();
        if (quoteError) throw quoteError;
        const realQuoteId = insertedQuote.id as string;
        setTickets(prev => prev.map(t => t.id === ticketId
          ? { ...t, quotes: t.quotes.map(q => q.id === quote.id ? { ...q, id: realQuoteId } : q), selectedQuoteId: realQuoteId }
          : t,
        ));
        await supabase.from("ticket_messages").insert({
          ticket_id: ticketId,
          artisan_id: ticket.artisanId,
          from_role: "artisan",
          content: replyMsg.content,
          sent_at: replyMsg.timestamp,
        });
        await syncTicketPatch(ticketId, { status: "reception_devis", selectedQuoteId: realQuoteId });
        refreshRemoteTickets();
      } catch (error) {
        console.error("Failed to persist received quote", error);
      }
    })();
    simulateAI(ticketId, [
      { msg: `📩 Devis reçu de ${artisan.nom} après diagnostic sur place`, type: "notification" },
      { msg: `Montant : ${montant} € — Délai : ${delai}`, type: "notification" },
      { msg: "Passage à l'étape Réception devis", type: "action" },
    ]);
  }, [tickets, artisans, refreshRemoteTickets, simulateAI, syncTicketPatch]);

  /**
   * Marks a received quote as the selected one on the ticket. Used when multiple quotes arrived
   * (via classify-reply from different artisans) and the gestionnaire clicks "Choisir" on one.
   *
   * Side effects:
   *   - ticket_quotes.is_selected updated for the chosen row (others reset to false)
   *   - tickets.selected_quote_id updated
   *   - if the ticket was still in "contact_artisan" (edge case when classify-reply missed the
   *     auto-transition), it is moved to "reception_devis" so the validation UI appears.
   */
  const selectQuote = useCallback((ticketId: string, quoteId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const shouldAdvanceStatus = ticket.status === "contact_artisan";

    // L'artisan "officiel" du ticket devient celui du devis sélectionné. Sans ça,
    // tous les flux en aval (accord proprio, relances facture, clôture) enverraient
    // les mails au PREMIER artisan contacté, pas à celui dont le devis est retenu.
    const quote = ticket.quotes.find((q) => q.id === quoteId);
    const newArtisanId = quote?.artisanId ?? ticket.artisanId;

    // Local optimistic update
    setTickets((prev) => prev.map((t) => t.id !== ticketId ? t : {
      ...t,
      selectedQuoteId: quoteId,
      quotes: t.quotes.map((q) => ({ ...q, selected: q.id === quoteId })),
      status: shouldAdvanceStatus ? "reception_devis" : t.status,
      artisanId: newArtisanId,
    }));

    void (async () => {
      if (!USE_SUPABASE) return;
      if (ticketId.startsWith("local-")) return;
      try {
        // Reset all quotes to is_selected=false for this ticket, then set the chosen one to true.
        // Two-step to avoid a unique-per-ticket constraint issue if there were one.
        await supabase.from("ticket_quotes").update({ is_selected: false }).eq("ticket_id", ticketId);
        await supabase.from("ticket_quotes").update({ is_selected: true }).eq("id", quoteId);
        await syncTicketPatch(ticketId, {
          selectedQuoteId: quoteId,
          artisanId: newArtisanId,
          ...(shouldAdvanceStatus ? { status: "reception_devis" as const } : {}),
        });
      } catch (error) {
        console.error("Failed to persist selectQuote", error);
      }
    })();
  }, [tickets, syncTicketPatch]);

  const validateQuote = useCallback((
    ticketId: string,
    _quoteId?: string,
    ownerEmailOverride?: { subject: string; content: string; attachmentDocumentIds?: string[] },
  ) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const selectedQuote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId);
    if (!selectedQuote) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);

    if (needsOwnerApproval(selectedQuote.montant)) {
      // Owner approval required → go to validation_proprio
      simulateAI(ticketId, [
        { msg: `Devis de ${selectedQuote.montant} € → au-dessus du seuil de délégation`, type: "analysis" },
        { msg: `Demande d'accord envoyée à ${ticket.bien.proprietaire} (${ticket.bien.emailProprio})`, type: "message_sent" },
        { msg: "En attente de l'accord propriétaire…", type: "notification" },
      ], () => {
        const defaultSubject = `Demande d'accord pour devis — ${ticket.bien.adresse}`;
        const defaultContent = autoContent("auto:proprietaire_accord_devis", ticket, artisan, `Bonjour, nous sollicitons votre accord pour le devis de ${selectedQuote.montant} € concernant votre bien au ${ticket.bien.adresse}. Merci de nous confirmer votre accord.`);
        dispatchOutbound({
          ticketId, threadKey: "proprietaire",
          // If the user previewed + edited in the modal, skip the template lookup and send the
          // exact content as-is. Otherwise fall back to the usual template path.
          useCase: ownerEmailOverride ? "" : "auto:proprietaire_accord_devis",
          fallbackSubject: ownerEmailOverride?.subject ?? defaultSubject,
          fallbackContent: ownerEmailOverride?.content ?? defaultContent,
          attachmentDocumentIds: ownerEmailOverride?.attachmentDocumentIds,
        });
        update(ticketId, { status: "validation_proprio", validationStatus: "en_attente" });
        void syncTicketPatch(ticketId, { status: "validation_proprio", validationStatus: "en_attente" }).catch((error) => {
          console.error("Failed to sync quote validation (owner needed)", error);
        });
      });
    } else {
      // Auto-validated → go straight to intervention
      simulateAI(ticketId, [
        { msg: `Devis de ${selectedQuote.montant} € validé automatiquement (sous le seuil de délégation)`, type: "validation" },
        { msg: `Confirmation envoyée à ${artisan?.nom}`, type: "message_sent" },
        { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
        { msg: "Passage à l'étape Intervention", type: "action" },
      ], () => {
        const artisanThreadKey = ticket.artisanId ?? selectedQuote.artisanId;
        const batchItems = [] as Array<{ ticketId: string; threadKey: string; useCase: string; fallbackSubject: string; fallbackContent: string }>;
        if (artisanThreadKey) batchItems.push({
          ticketId, threadKey: artisanThreadKey, useCase: "auto:artisan_devis_valide",
          fallbackSubject: `Devis validé — ${ticket.bien.adresse}`,
          fallbackContent: autoContent("auto:artisan_devis_valide", ticket, artisan, `Bonjour ${artisan?.nom ?? ""},\n\nLe devis de ${selectedQuote.montant} € a été validé. Merci de prendre contact avec le locataire ${ticket.locataire.nom} (${ticket.locataire.telephone}) pour convenir d'une date d'intervention au ${ticket.bien.adresse}.`),
        });
        batchItems.push({
          ticketId, threadKey: "locataire", useCase: "auto:locataire_artisan_vient",
          fallbackSubject: `Votre demande avance — ${ticket.bien.adresse}`,
          fallbackContent: autoContent("auto:locataire_artisan_vient", ticket, artisan, `Bonjour ${ticket.locataire.nom},\n\nVotre demande a été validée. L'artisan ${artisan?.nom ?? ""} va prochainement prendre contact avec vous pour convenir d'une date d'intervention au ${ticket.bien.adresse}.`),
        });
        void dispatchOutboundBatch("Devis validé automatiquement", batchItems);
        update(ticketId, { status: "intervention", validationStatus: "approuve" });
        void syncTicketPatch(ticketId, { status: "intervention", validationStatus: "approuve" }).catch((error) => {
          console.error("Failed to sync quote validation (auto)", error);
        });
      });
    }
  }, [tickets, artisans, needsOwnerApproval, autoContent, dispatchOutbound, dispatchOutboundBatch, simulateAI, syncTicketPatch, update]);

  const ownerRespond = useCallback((ticketId: string, approved: boolean, overrides?: { artisan?: { subject: string; content: string }; tenant?: { subject: string; content: string } }) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    if (approved) {
      simulateAI(ticketId, [
        { msg: `✅ ${ticket.bien.proprietaire} a approuvé le devis`, type: "validation" },
        { msg: `Confirmation envoyée à ${artisan?.nom}`, type: "message_sent" },
        { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
        { msg: "Passage à l'étape Intervention", type: "action" },
      ], () => {
        const artisanDefaultSubject = `Devis approuvé — ${ticket.bien.adresse}`;
        const artisanDefaultContent = autoContent("auto:artisan_devis_valide", ticket, artisan, `Bonjour ${artisan?.nom ?? ""},\n\nLe propriétaire a approuvé le devis de ${ticket.quotes.find(q => q.id === ticket.selectedQuoteId)?.montant ?? ""} €. Merci de prendre contact avec le locataire ${ticket.locataire.nom} (${ticket.locataire.telephone}) pour convenir d'une date d'intervention au ${ticket.bien.adresse}.`);
        const tenantDefaultSubject = `Intervention confirmée — ${ticket.bien.adresse}`;
        const tenantDefaultContent = autoContent("auto:locataire_proprio_approuve", ticket, artisan, `Bonjour ${ticket.locataire.nom},\n\nL'intervention au ${ticket.bien.adresse} a été confirmée par le propriétaire. L'artisan ${artisan?.nom ?? ""} va prochainement prendre contact avec vous pour convenir d'une date de passage.`);

        const ownerApprovedBatch: Array<{ ticketId: string; threadKey: string; useCase: string; fallbackSubject: string; fallbackContent: string }> = [];
        if (ticket.artisanId) ownerApprovedBatch.push({
          ticketId, threadKey: ticket.artisanId, useCase: "auto:artisan_devis_valide",
          fallbackSubject: overrides?.artisan?.subject ?? artisanDefaultSubject,
          fallbackContent: overrides?.artisan?.content ?? artisanDefaultContent,
        });
        ownerApprovedBatch.push({
          ticketId, threadKey: "locataire", useCase: "auto:locataire_proprio_approuve",
          fallbackSubject: overrides?.tenant?.subject ?? tenantDefaultSubject,
          fallbackContent: overrides?.tenant?.content ?? tenantDefaultContent,
        });
        void dispatchOutboundBatch("Approbation propriétaire", ownerApprovedBatch);
        update(ticketId, { status: "intervention", validationStatus: "approuve" });
        void syncTicketPatch(ticketId, { status: "intervention", validationStatus: "approuve" }).catch((error) => {
          console.error("Failed to sync owner response", error);
        });
      });
    } else {
      simulateAI(ticketId, [
        { msg: `❌ ${ticket.bien.proprietaire} a refusé le devis`, type: "validation" },
        { msg: "Retour à l'étape Contact artisan — possibilité de contacter un autre artisan", type: "notification" },
      ], () => {
        update(ticketId, { validationStatus: "refuse", status: "contact_artisan", selectedQuoteId: undefined, artisanId: undefined, quotes: [] });
        void (async () => {
          try {
            // Clear persisted quotes so the gestionnaire starts fresh. Otherwise the old
            // rows reappear on next fetch and the comparison card shows stale options.
            if (USE_SUPABASE && !ticketId.startsWith("local-")) {
              await supabase.from("ticket_quotes").delete().eq("ticket_id", ticketId);
            }
            await syncTicketPatch(ticketId, { validationStatus: "refuse", status: "contact_artisan", selectedQuoteId: undefined, artisanId: undefined });
          } catch (error) {
            console.error("Failed to sync owner refusal", error);
          }
        })();
      });
    }
  }, [tickets, artisans, autoContent, dispatchOutbound, dispatchOutboundBatch, simulateAI, syncTicketPatch, update]);

  const confirmPassage = useCallback((ticketId: string, confirmed: boolean) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const quote = ticket.quotes.find(q => q.selected);
    if (ticket.status === "intervention") {
      if (confirmed) {
        simulateAI(ticketId, [
          { msg: "📩 Facture reçue de l'artisan — discussion repositionnée sur l'étape Intervention", type: "notification" },
          { msg: `Email automatique envoyé à ${ticket.locataire.nom} pour demander une preuve de passage (photo/vidéo)`, type: "message_sent" },
          { msg: "Passage à l'étape Confirmation (en attente de la preuve locataire)", type: "action" },
        ], () => {
          dispatchOutbound({
            ticketId, threadKey: "locataire", useCase: "auto:locataire_preuve_passage",
            fallbackSubject: `Confirmation d'intervention — ${ticket.bien.adresse}`,
            fallbackContent: autoContent("auto:locataire_preuve_passage", ticket, null, `Bonjour ${ticket.locataire.nom},\n\nL'artisan nous a transmis sa facture. Pourriez-vous nous faire parvenir une photo ou une vidéo confirmant que l'intervention a bien eu lieu à votre domicile ?`),
          });
          update(ticketId, { status: "confirmation_passage", passageConfirme: false });
          void syncTicketPatch(ticketId, { status: "confirmation_passage", passageConfirme: false }).catch((error) => {
            console.error("Failed to sync confirmation wait state", error);
          });
        });
      } else {
        simulateAI(ticketId, [
          { msg: "❌ Pas de facture / intervention non confirmée par l'artisan", type: "notification" },
        ], () => {
          update(ticketId, { status: "intervention", passageConfirme: false });
          void syncTicketPatch(ticketId, { status: "intervention", passageConfirme: false }).catch((error) => {
            console.error("Failed to sync negative passage confirmation", error);
          });
        });
      }
      return;
    }

    if (ticket.status === "confirmation_passage") {
      if (confirmed) {
        const generatedInvoice = {
          montant: quote?.montant || 0,
          payee: false,
          refFacture: `FAC-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
          dateFacture: new Date().toISOString().slice(0, 10),
          prestation: quote?.description || "",
        };

        simulateAI(ticketId, [
          { msg: "✅ Preuve de passage reçue du locataire (photo/vidéo)", type: "validation" },
          { msg: "Passage à l'étape Facturation", type: "action" },
        ], () => {
          update(ticketId, {
            status: "facturation",
            passageConfirme: true,
            facture: generatedInvoice,
          });
          void syncTicketPatch(ticketId, {
            status: "facturation",
            passageConfirme: true,
            facture: generatedInvoice,
          }).catch((error) => {
            console.error("Failed to sync facturation step", error);
          });
        });
      } else {
        simulateAI(ticketId, [
          { msg: `Relance automatique envoyée à ${ticket.locataire.nom} pour demander la preuve de passage`, type: "reminder" },
          { msg: "Facturation bloquée tant que la preuve de passage n'est pas reçue", type: "notification" },
        ], () => {
          update(ticketId, { status: "confirmation_passage", passageConfirme: false });
          void syncTicketPatch(ticketId, { status: "confirmation_passage", passageConfirme: false }).catch((error) => {
            console.error("Failed to sync proof reminder state", error);
          });
        });
      }
      return;
    }
  }, [tickets, autoContent, dispatchOutbound, simulateAI, syncTicketPatch, update]);

  const validateFacture = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket?.facture) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    const payeur = ticket.responsabilite === "locataire" ? ticket.locataire.nom : ticket.bien.proprietaire;
    simulateAI(ticketId, [
      { msg: `Paiement de ${ticket.facture.montant} € envoyé à ${artisan?.nom}`, type: "action" },
      { msg: `Facturation de ${ticket.facture.montant} € transmise au ${payeur}`, type: "message_sent" },
      { msg: "Imputation comptable enregistrée", type: "action" },
      { msg: `Compte-rendu envoyé à ${ticket.bien.proprietaire}`, type: "message_sent" },
      { msg: `Information de clôture envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
      { msg: "Passage à l'étape Clôture", type: "action" },
    ], () => {
      const factureBatch: Array<{ ticketId: string; threadKey: string; useCase: string; fallbackSubject: string; fallbackContent: string }> = [];
      if (ticket.artisanId) factureBatch.push({
        ticketId, threadKey: ticket.artisanId, useCase: "auto:artisan_facture_payee",
        fallbackSubject: `Paiement transmis — ${ticket.bien.adresse}`,
        fallbackContent: autoContent("auto:artisan_facture_payee", ticket, artisan, `Bonjour ${artisan?.nom ?? ""},\n\nNous avons bien reçu et validé votre facture de ${ticket.facture!.montant} €. Le paiement vous a été transmis. Merci pour votre intervention.`),
      });
      factureBatch.push({
        ticketId, threadKey: "proprietaire", useCase: "auto:proprietaire_facture",
        fallbackSubject: `Compte-rendu travaux — ${ticket.bien.adresse}`,
        fallbackContent: autoContent("auto:proprietaire_facture", ticket, artisan, `Bonjour,\n\nVoici le compte-rendu d'intervention pour votre bien au ${ticket.bien.adresse}. La facture de ${ticket.facture!.montant} € a été réglée.`),
      });
      factureBatch.push({
        ticketId, threadKey: "locataire", useCase: "auto:locataire_cloture",
        fallbackSubject: `Dossier clôturé — ${ticket.bien.adresse}`,
        fallbackContent: autoContent("auto:locataire_cloture", ticket, artisan, `Bonjour ${ticket.locataire.nom},\n\nL'intervention à votre domicile est terminée et votre dossier est désormais clôturé. N'hésitez pas à nous contacter pour tout nouveau problème.`),
      });
      void dispatchOutboundBatch("Validation facture", factureBatch);
      update(ticketId, { status: "cloture", factureValidee: true, facture: { ...ticket.facture!, payee: true } });
      void syncTicketPatch(ticketId, { status: "cloture", factureValidee: true, facture: { ...ticket.facture!, payee: true } }).catch((error) => {
        console.error("Failed to sync invoice validation", error);
      });
    });
  }, [tickets, artisans, autoContent, dispatchOutbound, dispatchOutboundBatch, simulateAI, syncTicketPatch, update]);

  /**
   * Closes the ticket without sending any automatic messages.
   * Used when the RecipientSelector already handles message sending.
   */
  const finalizeFacture = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket?.facture) return;
    simulateAI(ticketId, [
      { msg: `Paiement de ${ticket.facture.montant} € validé`, type: "action" },
      { msg: "Imputation comptable enregistrée", type: "action" },
      { msg: "Passage à l'étape Clôture", type: "action" },
    ], () => {
      update(ticketId, { status: "cloture", factureValidee: true, facture: { ...ticket.facture!, payee: true } });
      void syncTicketPatch(ticketId, { status: "cloture", factureValidee: true, facture: { ...ticket.facture!, payee: true } }).catch((error) => {
        console.error("Failed to sync invoice finalization", error);
      });
    });
  }, [tickets, simulateAI, syncTicketPatch, update]);

  const sendFacturationAndClose = useCallback(async (
    ticketId: string,
    items: Array<{ threadKey: string; useCase: string; subject: string; content: string; attachmentDocumentIds: string[]; overrideEmail?: string; overrideName?: string; overrideRoleTag?: string }>,
  ) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket?.facture) return;
    const batchItems = items.map((item) => ({
      ticketId,
      threadKey: item.threadKey,
      useCase: item.useCase,
      fallbackSubject: item.subject,
      fallbackContent: item.content,
      attachmentDocumentIds: item.attachmentDocumentIds,
      overrideEmail: item.overrideEmail,
      overrideName: item.overrideName,
      overrideRoleTag: item.overrideRoleTag,
    }));
    await dispatchOutboundBatch("Envoi facture", batchItems);
    simulateAI(ticketId, [
      { msg: `Paiement de ${ticket.facture.montant} € validé`, type: "action" },
      { msg: "Imputation comptable enregistrée", type: "action" },
      { msg: "Passage à l'étape Clôture", type: "action" },
    ], () => {
      update(ticketId, { status: "cloture", factureValidee: true, facture: { ...ticket.facture!, payee: true } });
      void syncTicketPatch(ticketId, { status: "cloture", factureValidee: true, facture: { ...ticket.facture!, payee: true } }).catch((error) => {
        console.error("Failed to sync facturation send", error);
      });
    });
  }, [tickets, dispatchOutboundBatch, simulateAI, syncTicketPatch, update]);

  const relanceStakeholder = useCallback(async (ticketId: string, role: "owner" | "artisan" | "tenant") => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    let threadKey = "";
    let useCase = "";
    let fallbackContent = "";
    if (role === "owner") {
      threadKey = "proprietaire";
      useCase = "auto:proprietaire_accord_devis";
      fallbackContent = `Bonjour ${ticket.bien.proprietaire},\n\nNous revenons vers vous au sujet du devis en attente d'accord pour le ${ticket.bien.adresse}. Auriez-vous un retour à nous transmettre ?\n\nBien cordialement,\n${settings.agency_name}`;
    } else if (role === "artisan") {
      if (!ticket.artisanId) return;
      threadKey = ticket.artisanId;
      useCase = "auto:artisan_relance_date";
      const artisanRec = artisans.find(a => a.id === ticket.artisanId);
      fallbackContent = `Bonjour ${artisanRec?.nom ?? ""},\n\nPetit point sur la demande d'intervention au ${ticket.bien.adresse}. Où en est-on de votre côté ?\n\nMerci,\n${settings.agency_name}`;
    } else {
      threadKey = "locataire";
      useCase = "auto:locataire_contact_artisan";
      fallbackContent = `Bonjour ${ticket.locataire.nom},\n\nNous revenons vers vous au sujet de votre demande au ${ticket.bien.adresse}. Avez-vous du nouveau à nous signaler ?\n\nBien à vous,\n${settings.agency_name}`;
    }
    const res = await dispatchOutbound({
      ticketId,
      threadKey,
      useCase,
      fallbackSubject: `Relance — ${ticket.bien.adresse}`,
      fallbackContent,
    });
    if (res.ok) toast.success("Relance envoyée");
  }, [tickets, artisans, dispatchOutbound, settings.agency_name]);

  const advanceToFacturation = useCallback((ticketId: string) => {
    simulateAI(ticketId, [{ msg: "Passage à l'étape Facturation", type: "action" }], () => {
      update(ticketId, { status: "facturation" });
      void syncTicketPatch(ticketId, { status: "facturation" }).catch((error) => {
        console.error("Failed to sync advance to facturation", error);
      });
    });
  }, [simulateAI, syncTicketPatch, update]);

  const closeTicket = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    simulateAI(ticketId, [
      { msg: `Message de clôture envoyé à ${ticket.locataire.nom} : "Votre demande a bien été traitée."`, type: "message_sent" },
      { msg: `Compte-rendu complet envoyé à ${ticket.bien.proprietaire}`, type: "message_sent" },
      { msg: "Ticket archivé dans la base de données", type: "action" },
    ], () => {
      void dispatchOutboundBatch("Clôture ticket", [
        {
          ticketId, threadKey: "locataire", useCase: "auto:locataire_cloture",
          fallbackSubject: `Dossier clôturé — ${ticket.bien.adresse}`,
          fallbackContent: autoContent("auto:locataire_cloture", ticket, null, `Bonjour ${ticket.locataire.nom},\n\nVotre demande a bien été traitée. Votre dossier est désormais clôturé. N'hésitez pas à nous contacter pour tout nouveau problème.`),
        },
        {
          ticketId, threadKey: "proprietaire", useCase: "auto:proprietaire_cloture",
          fallbackSubject: `Compte-rendu — ${ticket.bien.adresse}`,
          fallbackContent: autoContent("auto:proprietaire_cloture", ticket, null, `Bonjour,\n\nVoici le compte-rendu complet pour votre bien au ${ticket.bien.adresse}. Le dossier "${ticket.titre}" a été clôturé avec succès.`),
        },
      ]);
      update(ticketId, { status: "cloture" });
      void syncTicketPatch(ticketId, { status: "cloture" }).catch((error) => {
        console.error("Failed to sync ticket closure", error);
      });
    });
  }, [tickets, autoContent, dispatchOutbound, dispatchOutboundBatch, simulateAI, syncTicketPatch, update]);

  const contactSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || !ticket.syndic) return;
    simulateAI(ticketId, [
      { msg: `Mail envoyé au syndic ${ticket.syndic.nom} (${ticket.syndic.email})`, type: "message_sent" },
      { msg: `Objet : Signalement incident parties communes — ${ticket.bien.adresse}`, type: "message_sent" },
      { msg: `Description : ${ticket.description.slice(0, 80)}…`, type: "message_sent" },
      { msg: "En attente de réponse du syndic…", type: "notification" },
    ], () => {
      dispatchOutbound({
        ticketId, threadKey: "syndic", useCase: "auto:contact_syndic",
        fallbackSubject: `Signalement incident — ${ticket.bien.adresse}`,
        fallbackContent: autoContent("auto:contact_syndic", ticket, null, `Bonjour,\n\nNous vous signalons un incident dans les parties communes au ${ticket.bien.adresse}.\n\nDescription : ${ticket.description}\n\nMerci de bien vouloir prendre en charge ce problème dans les meilleurs délais.`),
      });
      update(ticketId, { status: "relance_syndic", syndicRelances: [] });
      void syncTicketPatch(ticketId, { status: "relance_syndic" }).catch((error) => {
        console.error("Failed to sync syndic contact", error);
      });
    });
  }, [tickets, autoContent, dispatchOutbound, simulateAI, syncTicketPatch, update]);

  const relanceSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || !ticket.syndic) return;
    const relances = ticket.syndicRelances || [];
    const numero = relances.length + 1;
    const date = new Date().toISOString().slice(0, 10);
    const isEscalade = numero >= 3;
    simulateAI(ticketId, [
      { msg: `Relance automatique #${numero} envoyée à ${ticket.syndic.nom} le ${date}`, type: "message_sent" },
      { msg: numero >= 2 ? "Toujours sans réponse du syndic" : "En attente de réponse…", type: "notification" },
      ...(isEscalade ? [{ msg: "Seuil de relances atteint — passage en escalade", type: "action" as const }] : []),
    ], () => {
      dispatchOutbound({
        ticketId, threadKey: "syndic", useCase: "auto:relance_syndic",
        fallbackSubject: `Relance n°${numero} — Incident ${ticket.bien.adresse}`,
        fallbackContent: autoContent("auto:relance_syndic", ticket, null, `Bonjour,\n\nRelance n°${numero} — Sans réponse de votre part depuis notre précédent contact concernant l'incident au ${ticket.bien.adresse}. Merci de bien vouloir traiter ce signalement dans les meilleurs délais.`),
      });
      if (isEscalade) {
        update(ticketId, { status: "escalade_syndic", syndicRelances: [...relances, { date, numero }], syndicEscalade: true });
        void syncTicketPatch(ticketId, { status: "escalade_syndic" }).catch((error) => {
          console.error("Failed to sync syndic escalation", error);
        });
      } else {
        update(ticketId, { syndicRelances: [...relances, { date, numero }] });
      }
    });
    void (async () => {
      if (!USE_SUPABASE) return;
      if (ticketId.startsWith("local-")) return;
      try {
        await supabase.from("ticket_syndic_followups").insert({
          ticket_id: ticketId,
          number: numero,
          channel: "email",
          sent_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to persist syndic followup", error);
      }
    })();
  }, [tickets, autoContent, dispatchOutbound, simulateAI, syncTicketPatch, update]);

  const escaladeSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    simulateAI(ticketId, [
      { msg: "Escalade : recommandation de mise en demeure", type: "action" },
      { msg: `Projet de mise en demeure généré pour ${ticket.syndic?.nom}`, type: "action" },
    ], () => {
      update(ticketId, { syndicEscalade: true });
      void syncTicketPatch(ticketId, { status: "escalade_syndic" }).catch((error) => {
        console.error("Failed to sync syndic escalation", error);
      });
    });
  }, [tickets, simulateAI, syncTicketPatch, update]);

  const resolveSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    simulateAI(ticketId, [
      { msg: `Le syndic ${ticket.syndic?.nom} a répondu / est intervenu`, type: "validation" },
      { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
      { msg: "Passage à la clôture", type: "action" },
    ], () => {
      dispatchOutbound({
        ticketId, threadKey: "locataire", useCase: "auto:locataire_cloture",
        fallbackSubject: `Votre dossier — ${ticket.bien.adresse}`,
        fallbackContent: autoContent("auto:locataire_cloture", ticket, null, `Bonjour ${ticket.locataire.nom},\n\nBonne nouvelle : le syndic est intervenu et le problème au ${ticket.bien.adresse} est en cours de résolution. Votre dossier sera prochainement clôturé.`),
      });
      update(ticketId, { status: "cloture" });
      void syncTicketPatch(ticketId, { status: "cloture" }).catch((error) => {
        console.error("Failed to sync syndic resolution", error);
      });
    });
  }, [tickets, autoContent, dispatchOutbound, simulateAI, syncTicketPatch, update]);

  const addMessage = useCallback((ticketId: string, threadKey: string, content: string, from: "agence" | "artisan", subject?: string, templateId?: string) => {
    const isArtisanUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadKey);

    // ── PROD: message manuel agence → vrai email via send-ticket-email ──────────
    // L'edge function envoie via Resend (avec threading headers) + insère ticket_messages.
    // On skip l'optimistic update pour éviter le doublon au refetch.
    if (from === "agence" && !settings.demo_mode && USE_SUPABASE && !ticketId.startsWith("local-")) {
      const recipientType: "artisan" | "locataire" | "proprietaire" | "syndic" =
        isArtisanUuid ? "artisan" :
        threadKey === "locataire" ? "locataire" :
        threadKey === "proprietaire" ? "proprietaire" :
        threadKey === "syndic" ? "syndic" : "locataire";

      void (async () => {
        try {
          const res = await invokeSendTicketEmail({
            ticket_id: ticketId,
            recipient_type: recipientType,
            artisan_id: isArtisanUuid ? threadKey : undefined,
            template_use_case: templateId,
            fallback_content: content,
            fallback_subject: subject?.trim() || "Message concernant votre dossier",
          });
          await fetchTicketMessagesRef.current?.(ticketId);
          toast.success("Message envoyé", { description: `Log : ${res.correlation_id.slice(0, 8)}` });
        } catch (err) {
          const errMsg = err instanceof SendTicketEmailError ? err.message : err instanceof Error ? err.message : String(err);
          console.error("addMessage (prod) failed", err);
          toast.error("Échec envoi message", { description: errMsg });
        }
      })();
      return;
    }

    // ── DEMO ou from=artisan : comportement simulé (local + insert ticket_messages) ──
    const msg: TicketMessage = { id: `msg-${Date.now()}`, from, content, subject, template_id: templateId, timestamp: new Date().toISOString() };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t, messages: { ...t.messages, [threadKey]: [...(t.messages[threadKey] || []), msg] }
    } : t));

    // If the artisan sends the invoice by email, keep the workflow on Intervention and trigger
    // an automatic request to tenant proof before billing. (Demo-only; in prod this flow is
    // handled by classify-reply on the inbound email.)
    if (from === "artisan") {
      const normalized = content.toLowerCase();
      const invoiceMentioned = /facture|invoice|pdf|pi[eè]ce jointe/.test(normalized);
      if (invoiceMentioned) {
        const current = ticketsRef.current.find((t) => t.id === ticketId);
        if (current) {
          simulateAI(ticketId, [
            { msg: "Facture artisan détectée dans la conversation", type: "notification" },
            { msg: "Retour à l'étape Intervention pour valider le passage", type: "status_change" },
            { msg: `Email automatique envoyé à ${current.locataire.nom} pour demander une preuve de passage (photo/vidéo)`, type: "message_sent" },
          ], () => {
            update(ticketId, { status: "intervention", passageConfirme: false });
            void syncTicketPatch(ticketId, { status: "intervention", passageConfirme: false }).catch((error) => {
              console.error("Failed to sync intervention rewind after invoice message", error);
            });
          });
        }
      }
    }

    void (async () => {
      if (!USE_SUPABASE) return;
      if (ticketId.startsWith("local-")) return;
      try {
        const recipientTypeMap: Record<string, string> = {
          locataire: "tenant", proprietaire: "owner", syndic: "syndic", assurance: "insurance",
        };
        await supabase.from("ticket_messages").insert({
          ticket_id: ticketId,
          artisan_id: isArtisanUuid ? threadKey : null,
          recipient_type: isArtisanUuid ? "artisan" : (recipientTypeMap[threadKey] ?? threadKey),
          from_role: from === "artisan" ? "artisan" : "agency",
          content,
          subject: subject ?? null,
          template_id: templateId ?? null,
          sent_at: msg.timestamp,
        });
      } catch (error) {
        console.error("Failed to persist ticket message", error);
      }
    })();
  }, [settings.demo_mode, simulateAI, syncTicketPatch, update]);

  const addArtisan = useCallback((data: Omit<Artisan, "id">, overrideAgencyId?: string) => {
    const agencyId = overrideAgencyId ?? agencyIdRef.current; // explicit ID takes priority
    const id = USE_SUPABASE ? crypto.randomUUID() : `artisan-${Date.now()}`;
    setArtisans(prev => [...prev, { id, ...data }]);
    void (async () => {
      if (!USE_SUPABASE) return;
      const isValidAgencyId = isUuid(agencyId);
      if (!isValidAgencyId) {
        console.error("addArtisan: agency_id invalide, l'artisan ne sera pas enregistré", { agencyId });
        setArtisans(prev => prev.filter(a => a.id !== id));
        return;
      }
      const { error } = await supabase.from("artisans").insert({
        id,
        agency_id: agencyId,
        name: data.nom,
        specialties: data.specialites,
        city: data.ville,
        address: data.address ?? null,
        rating: data.note,
        interventions_count: data.interventions,
        average_delay: data.delaiMoyen,
        phone: data.telephone,
        email: data.email,
        is_trusted: true,
      });
      if (error) {
        console.error("Failed to persist artisan, rollback", error.message);
        setArtisans(prev => prev.filter(a => a.id !== id));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // agencyIdRef is stable — reads current value at call time, no closure needed

  const updateArtisan = useCallback((id: string, data: Partial<Omit<Artisan, "id">>) => {
    setArtisans(prev => prev.map(artisan => (artisan.id === id ? { ...artisan, ...data } : artisan)));

    void (async () => {
      if (!USE_SUPABASE) return;

      const payload: Record<string, unknown> = {};
      if ("nom" in data) payload.name = data.nom;
      if ("specialites" in data) payload.specialties = data.specialites;
      if ("ville" in data) payload.city = data.ville;
      if ("address" in data) payload.address = data.address ?? null;
      if ("note" in data) payload.rating = data.note;
      if ("interventions" in data) payload.interventions_count = data.interventions;
      if ("delaiMoyen" in data) payload.average_delay = data.delaiMoyen;
      if ("telephone" in data) payload.phone = data.telephone;
      if ("email" in data) payload.email = data.email;

      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase.from("artisans").update(payload).eq("id", id);
      if (error) {
        console.error("Failed to update artisan", error.message);
      }
    })();
  }, []);

  const removeArtisan = useCallback((id: string) => {
    setArtisans(prev => prev.filter(a => a.id !== id));
    void (async () => {
      if (!USE_SUPABASE) return;
      try {
        await supabase.from("artisans").delete().eq("id", id);
      } catch (error) {
        console.error("Failed to delete artisan", error);
      }
    })();
  }, []);

  const setDisponibilites = useCallback((ticketId: string, target: "artisan" | "locataire", slots: TimeSlot[]) => {
    setTickets(prev => prev.map(ticket => ticket.id === ticketId ? {
      ...ticket,
      disponibilitesArtisan: target === "artisan" ? slots : ticket.disponibilitesArtisan,
      disponibilitesLocataire: target === "locataire" ? slots : ticket.disponibilitesLocataire,
    } : ticket));
  }, []);

  const matchAndConfirm = useCallback((ticketId: string) => {
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) return;

    const overlappingSlot = ticket.disponibilitesArtisan.find((slot) =>
      ticket.disponibilitesLocataire.some((ls) => ls.date === slot.date && ls.heure === slot.heure)
    );
    const selectedSlot = overlappingSlot ?? ticket.disponibilitesArtisan[0] ?? ticket.disponibilitesLocataire[0];
    if (!selectedSlot) return;

    // Build a proper ISO 8601 string with local timezone offset so DateTimePicker
    // and Supabase timestamptz both handle it correctly.
    const buildIso = (date: string, heure: string) => {
      const [h, m] = (heure || "00:00").split(":").map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      const off = -d.getTimezoneOffset();
      const sign = off >= 0 ? "+" : "-";
      const absOff = Math.abs(off);
      const offH = String(Math.floor(absOff / 60)).padStart(2, "0");
      const offM = String(absOff % 60).padStart(2, "0");
      return `${date}T${heure}:00${sign}${offH}:${offM}`;
    };
    const dateStr = buildIso(selectedSlot.date, selectedSlot.heure);

    update(ticketId, {
      status: "confirmation_passage",
      dateInterventionPrevue: dateStr,
    });
    void syncTicketPatch(ticketId, {
      status: "confirmation_passage",
      dateInterventionPrevue: dateStr,
    }).catch((error) => {
      console.error("Failed to sync matched intervention slot", error);
    });
  }, [tickets, syncTicketPatch, update]);

  const getTicket = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);
  const getArtisan = useCallback((id: string) => artisans.find(a => a.id === id), [artisans]);

  const validateSignalement = useCallback(async (
    signalement: InboundSignalement,
    overrides?: Partial<{ title: string; category: TicketCategory; priority: TicketPriority; responsibility: Responsabilite; description: string; urgent: boolean; tenantName: string; tenantPhone: string; tenantEmail: string; propertyAddress: string; propertyUnit: string; ownerName: string; ownerPhone: string; ownerEmail: string; tenant_id: string; property_id: string; owner_id: string }>,
  ): Promise<Ticket> => {
    const ai = signalement.ai_suggestion ?? {};
    // AI output uses English values ("plumbing" / "tenant" / …). Normalize to the local vocabulary
    // so the UI's enum-indexed labels (categoryLabels, responsabiliteLabels) resolve correctly.
    // Without this step, the local ticket carries raw AI values that only show up after a full
    // refresh (when fetchHydratedTickets re-reads from DB and applies the same mapping).
    const categorie: TicketCategory = overrides?.category ?? toTicketCategory(ai.category);
    const priorite: TicketPriority = overrides?.priority ?? toTicketPriority(ai.priority);
    const responsabilite: Responsabilite = overrides?.responsibility ?? toResponsabilite(ai.responsibility) ?? "proprietaire";
    const description = overrides?.description ?? ai.ai_qualified_description ?? ai.ai_summary ?? signalement.body_text;
    const titre = overrides?.title ?? ai.title ?? signalement.subject;
    const urgence = overrides?.urgent ?? ai.is_urgent ?? false;
    const tenantName = overrides?.tenantName ?? ai.tenant_name ?? "";
    const tenantPhone = overrides?.tenantPhone ?? ai.tenant_phone ?? "";
    const tenantEmail = overrides?.tenantEmail ?? signalement.from_email ?? "";
    const propertyAddress = overrides?.propertyAddress ?? ai.property_address ?? "";
    const propertyUnit = overrides?.propertyUnit ?? ai.property_unit ?? "";
    const ownerName = overrides?.ownerName ?? ai.owner_name ?? "";
    const ownerPhone = overrides?.ownerPhone ?? ai.owner_phone ?? "";
    const ownerEmail = overrides?.ownerEmail ?? ai.owner_email ?? "";
    const now = new Date().toISOString();
    const newTicket: Ticket = {
      id: `local-${Date.now()}`,
      reference: "CLR-...",
      source: "email",
      inbound_email_id: signalement.id,
      titre,
      description,
      status: "signale",
      priorite,
      categorie,
      responsabilite,
      dateCreation: now,
      dateMaj: now,
      urgence,
      locataire: { nom: tenantName, telephone: tenantPhone, email: tenantEmail },
      bien: { adresse: propertyAddress, lot: propertyUnit, proprietaire: ownerName, telephoneProprio: ownerPhone, emailProprio: ownerEmail },
      tenant_id: overrides?.tenant_id,
      property_id: overrides?.property_id,
      owner_id: overrides?.owner_id,
      quotes: [],
      messages: {},
      photos: [],
      documents: [],
      notes: [],
      disponibilitesArtisan: [],
      disponibilitesLocataire: [],
      mailSource: {
        from: signalement.from_email,
        to: signalement.to_email,
        subject: signalement.subject,
        body: signalement.body_text,
        receivedAt: signalement.received_at,
        attachments: signalement.attachments ?? null,
      },
    };
    setTickets((prev) => [newTicket, ...prev]);

    if (USE_SUPABASE) {
      const agencyId = settings.agency_id;
      const isValidAgency = isUuid(agencyId);
      const validationStatus = overrides ? "modified" : "validated";

      try {
        // Resolve active lease for the tenant (same best-effort logic as createTicket).
        const activeLease = overrides?.tenant_id && isValidAgency
          ? await resolveActiveLeaseForTenant(overrides.tenant_id, agencyId)
          : null;

        // INSERT ticket
        const { data: inserted, error } = await supabase.from("tickets").insert({
          agency_id: isValidAgency ? agencyId : null,
          source: "email",
          inbound_email_id: signalement.id,
          title: titre,
          description,
          status: mapStatusToDb("signale"),
          priority: mapPriorityToDb(priorite),
          category: mapCategoryToDb(categorie),
          is_urgent: urgence,
          responsibility: mapResponsabiliteToDb(responsabilite),
          tenant_name: tenantName || null,
          tenant_phone: tenantPhone || null,
          tenant_email: tenantEmail || null,
          property_address: propertyAddress || null,
          property_unit: propertyUnit || null,
          property_owner_name: ownerName || null,
          property_owner_phone: ownerPhone || null,
          property_owner_email: ownerEmail || null,
          tenant_id: overrides?.tenant_id || null,
          property_id: overrides?.property_id || null,
          owner_id: overrides?.owner_id || null,
          lease_id: activeLease?.id ?? null,
          lease_ref: activeLease?.external_ref ?? null,
        }).select("id, reference").single();

        if (error) {
          console.error("[validateSignalement] ticket insert failed", error);
          return newTicket;
        }

        // Replace local ID with real DB ID
        const realId = inserted.id;
        const realRef = inserted.reference ?? newTicket.reference;
        setTickets((prev) => prev.map((t) => (t.id === newTicket.id ? { ...t, id: realId, reference: realRef } : t)));
        newTicket.id = realId;
        newTicket.reference = realRef;

        // UPDATE inbound_emails: link ticket + set validation_status
        await supabase.from("inbound_emails").update({
          ticket_id: realId,
          validation_status: validationStatus,
          ai_suggestion: {
            ...(signalement.ai_suggestion ?? {}),
            title: titre,
            category: categorie,
            priority: priorite,
            responsibility: responsabilite,
            ai_qualified_description: description,
            ai_summary: description,
            tenant_name: tenantName || undefined,
            tenant_phone: tenantPhone || undefined,
            property_address: propertyAddress || undefined,
            property_unit: propertyUnit || undefined,
            owner_name: ownerName || undefined,
            owner_phone: ownerPhone || undefined,
            owner_email: ownerEmail || undefined,
            is_urgent: urgence,
          },
        }).eq("id", signalement.id);

        // INSERT journal entry
        await supabase.from("ticket_journal_entries").insert({
          ticket_id: realId,
          type: "action",
          status: "done",
          message: `Signalement validé et ticket créé à partir de l'email de ${signalement.from_email}`,
          triggered_by: "user",
          occurred_at: now,
        });

        // INSERT mail source
        await supabase.from("ticket_mail_sources").insert({
          ticket_id: realId,
          from_email: signalement.from_email,
          to_email: signalement.to_email,
          subject: signalement.subject,
          body: signalement.body_text,
          received_at: signalement.received_at,
          attachments: signalement.attachments ?? null,
        });

        // Remove from local signalements state so it disappears immediately
        removeSignalement(signalement.id);
      } catch (err) {
        console.error("[validateSignalement] error", err);
      }
    }

    return newTicket;
  }, [settings.agency_id, syncTicketPatch, removeSignalement]);

  const updateTicket = useCallback((id: string, data: Partial<Ticket>) => {
    update(id, data);
    void syncTicketPatch(id, data).catch((error) => {
      console.error("Failed to sync ticket update", error);
    });
  }, [syncTicketPatch, update]);

  const fetchTicketDocuments = useCallback(async (ticketId: string) => {
    if (!USE_SUPABASE) return;
    const { data, error } = await supabase
      .from("ticket_documents")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("uploaded_at", { ascending: false });
    if (error || !data) return;

    const docsWithUrls: TicketDocument[] = await Promise.all(
      data.map(async (row) => {
        const { data: urlData } = await supabase.storage
          .from("ticket-documents")
          .createSignedUrl(row.storage_path, 3600);
        return {
          id: row.id,
          ticket_id: row.ticket_id,
          document_type: row.document_type as TicketDocumentType,
          file_name: row.file_name,
          file_url: urlData?.signedUrl ?? row.file_url,
          storage_path: row.storage_path,
          mime_type: row.mime_type ?? undefined,
          file_size: row.file_size ?? undefined,
          uploaded_by: row.uploaded_by ?? undefined,
          uploaded_at: row.uploaded_at,
          description: row.description ?? undefined,
          quote_id: row.quote_id ?? undefined,
          ticket_message_id: row.ticket_message_id ?? undefined,
        };
      }),
    );

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, documents: docsWithUrls } : t)),
    );
  }, []);

  const fetchTicketMessages = useCallback(async (ticketId: string) => {
    if (!USE_SUPABASE) return;
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("id, ticket_id, artisan_id, recipient_type, from_role, content, subject, template_id, sent_at, created_at, direction, ai_classification, attachment_document_ids")
      .eq("ticket_id", ticketId)
      .order("sent_at", { ascending: true });
    if (error || !data) return;

    // DB vocabulary: from_role uses 'tenant'/'owner' (canonical). Frontend vocabulary uses 'locataire'/'proprietaire'.
    // Map both directions so older rows (if any) still render correctly.
    const recipientTypeToLocal: Record<string, string> = {
      tenant: "locataire", owner: "proprietaire", syndic: "syndic", insurance: "assurance",
    };
    const fromRoleToLocal: Record<string, TicketMessage["from"]> = {
      agency: "agence",
      artisan: "artisan",
      tenant: "locataire", locataire: "locataire",
      owner: "proprietaire", proprietaire: "proprietaire",
      syndic: "syndic",
      assurance: "assurance",
    };
    const messages = data.reduce<Record<string, TicketMessage[]>>((acc, row) => {
      const rawType = (row.recipient_type as string | null) ?? "";
      const direction = (row.direction as string | null) ?? "outbound";
      // Thread routing:
      // - outbound: artisan_id (if set) or recipient_type maps to locataire/proprietaire/syndic
      // - inbound: same logic — artisan_id is set when an artisan replies, else recipient_type carries the sender bucket
      const key = (row.artisan_id as string | null) ?? recipientTypeToLocal[rawType] ?? (rawType || "general");
      const role = (row.from_role as string | null) ?? "";
      const msg: TicketMessage = {
        id: row.id as string,
        from: fromRoleToLocal[role] ?? (direction === "inbound" ? "locataire" : "agence"),
        content: (row.content as string | null) ?? "",
        subject: (row.subject as string | null) ?? undefined,
        template_id: (row.template_id as string | null) ?? undefined,
        timestamp: (row.sent_at as string | null) ?? (row.created_at as string | null) ?? new Date().toISOString(),
        direction: (row.direction as "outbound" | "inbound" | null) ?? undefined,
        ai_classification: (row.ai_classification as TicketMessage["ai_classification"]) ?? undefined,
        attachment_document_ids: (row.attachment_document_ids as string[] | null) ?? undefined,
      };
      acc[key] = [...(acc[key] ?? []), msg];
      return acc;
    }, {});

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, messages } : t)),
    );
  }, []);

  // Bind the late-refs so the realtime subscription (set up earlier in the file) can invoke them.
  useEffect(() => {
    fetchTicketMessagesRef.current = fetchTicketMessages;
  }, [fetchTicketMessages]);
  useEffect(() => {
    fetchTicketDocumentsRef.current = fetchTicketDocuments;
  }, [fetchTicketDocuments]);

  const uploadTicketDocument = useCallback(async (
    ticketId: string,
    file: File,
    documentType: TicketDocumentType,
    description?: string,
  ): Promise<TicketDocument> => {
    const agencyId = settings.agency_id;
    const ext = file.name.split(".").pop() ?? "bin";
    const fileId = crypto.randomUUID();
    const storagePath = `${ticketId}/${fileId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("ticket-documents")
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) throw uploadError;

    const { data: urlData } = await supabase.storage
      .from("ticket-documents")
      .createSignedUrl(storagePath, 3600);

    const { data: inserted, error: insertError } = await supabase
      .from("ticket_documents")
      .insert({
        ticket_id: ticketId,
        agency_id: agencyId,
        document_type: documentType,
        file_name: file.name,
        file_url: urlData?.signedUrl ?? "",
        storage_path: storagePath,
        mime_type: file.type || null,
        file_size: file.size || null,
        description: description || null,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    const newDoc: TicketDocument = {
      id: inserted.id,
      ticket_id: ticketId,
      document_type: documentType,
      file_name: file.name,
      file_url: urlData?.signedUrl ?? "",
      storage_path: storagePath,
      mime_type: file.type || undefined,
      file_size: file.size || undefined,
      uploaded_at: inserted.uploaded_at,
      description: description || undefined,
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, documents: [newDoc, ...(t.documents ?? [])] } : t,
      ),
    );

    return newDoc;
  }, [settings.agency_id]);

  const updateTicketDocument = useCallback(async (
    ticketId: string,
    docId: string,
    patch: { description?: string; document_type?: TicketDocumentType; file_name?: string },
  ) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id !== ticketId ? t : {
          ...t,
          documents: t.documents.map((d) =>
            d.id === docId ? { ...d, ...patch } : d,
          ),
        },
      ),
    );
    if (!USE_SUPABASE) return;
    await supabase.from("ticket_documents").update(patch).eq("id", docId);
  }, []);

  const refreshTicket = useCallback(async (ticketId: string) => {
    if (!USE_SUPABASE) return;
    // Parallel: full tickets list refresh, this ticket's messages, this ticket's documents.
    // The tickets list refetch is the slowest but cheapest per-row; messages & docs are per-ticket.
    await Promise.all([
      refetchTickets().catch((error) => console.error("refreshTicket: tickets refetch failed", error)),
      fetchTicketMessagesRef.current?.(ticketId).catch((error) => console.error("refreshTicket: messages failed", error)) ?? Promise.resolve(),
    ]);
  }, [refetchTickets]);

  const value = useMemo(() => ({
    tickets, artisans, journalEntries, showJournal, activeTicketId, loading,
    setShowJournal, setActiveTicketId,
    createTicket, updateTicket, qualifyTicket, sendArtisanContact,
    receiveQuote, selectQuote, validateQuote, ownerRespond,
    confirmPassage, advanceToFacturation, validateFacture, finalizeFacture, sendFacturationAndClose, closeTicket, relanceStakeholder,
    contactSyndic, relanceSyndic, escaladeSyndic, resolveSyndic,
    addMessage, addArtisan, updateArtisan, removeArtisan, setDisponibilites, matchAndConfirm,
    getTicket, getArtisan, validateSignalement,
    signalements, signalementsLoading, removeSignalement, refetchSignalements,
    fetchTicketDocuments, uploadTicketDocument, updateTicketDocument,
    fetchTicketMessages, refreshTicket, refetchTickets,
  }), [
    tickets, artisans, journalEntries, showJournal, activeTicketId, loading,
    signalements, signalementsLoading, removeSignalement, refetchSignalements,
    createTicket, updateTicket, qualifyTicket, sendArtisanContact,
    receiveQuote, selectQuote, validateQuote, ownerRespond,
    confirmPassage, advanceToFacturation, validateFacture, finalizeFacture, sendFacturationAndClose, closeTicket, relanceStakeholder,
    contactSyndic, relanceSyndic, escaladeSyndic, resolveSyndic,
    addMessage, addArtisan, updateArtisan, removeArtisan, setDisponibilites, matchAndConfirm,
    getTicket, getArtisan, validateSignalement,
    fetchTicketDocuments, uploadTicketDocument, updateTicketDocument,
    fetchTicketMessages, refreshTicket,
    refetchTickets,
  ]);

  if (USE_SUPABASE && !hydrated) {
    return <AppLoader />;
  }

  return (
    <TicketContext.Provider value={value}>
      {children}
    </TicketContext.Provider>
  );
}
