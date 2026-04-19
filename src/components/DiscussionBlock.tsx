import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Artisan, EmailTemplate, TicketDocument, categoryLabels } from "@/data/types";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiscussionThread } from "@/components/DiscussionThread";
import { MessageSquare, User, Home, Wrench, Building2, Shield } from "lucide-react";

const STAKEHOLDER_KEYS = ["locataire", "proprietaire", "syndic", "assurance"] as const;
type StakeholderKey = (typeof STAKEHOLDER_KEYS)[number];

const STAKEHOLDER_LABELS: Record<StakeholderKey, string> = {
  locataire:    "Locataire",
  proprietaire: "Propriétaire",
  syndic:       "Syndic",
  assurance:    "Assurance",
};

const STAKEHOLDER_ICONS: Record<StakeholderKey | "artisans", React.ReactNode> = {
  locataire:    <User className="h-3 w-3" />,
  proprietaire: <Home className="h-3 w-3" />,
  syndic:       <Building2 className="h-3 w-3" />,
  assurance:    <Shield className="h-3 w-3" />,
  artisans:     <Wrench className="h-3 w-3" />,
};

const STAKEHOLDER_TARGET: Record<StakeholderKey, EmailTemplate["target"]> = {
  locataire:    "locataire",
  proprietaire: "proprietaire",
  syndic:       "syndic",
  assurance:    "syndic",
};

/** Replaces {{variable}} placeholders with actual ticket values */
function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function buildVars(
  ticket: Ticket,
  artisan: Artisan | null,
  agencyName: string,
): Record<string, string> {
  const selectedQuote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId);
  return {
    nom_agence:           agencyName,
    adresse:              ticket.bien.adresse,
    lot:                  ticket.bien.lot,
    categorie:            categoryLabels[ticket.categorie] ?? ticket.categorie,
    description:          ticket.description,
    nom_artisan:          artisan?.nom ?? "",
    telephone_artisan:    artisan?.telephone ?? "",
    nom_locataire:        ticket.locataire.nom,
    telephone_locataire:  ticket.locataire.telephone,
    nom_proprietaire:     ticket.bien.proprietaire,
    telephone_proprietaire: ticket.bien.telephoneProprio,
    montant:              selectedQuote ? `${selectedQuote.montant} €` : (ticket.facture ? `${ticket.facture.montant} €` : ""),
    date_intervention:    ticket.dateInterventionPrevue ?? "",
  };
}

interface Props {
  ticket: Ticket;
  artisans: Artisan[];
  emailTemplates: EmailTemplate[];
  focusTab?: string | null;
  onFocused?: () => void;
  /** État "non lu" par thread — fourni par useTicketReadState côté parent. */
  threadUnread?: (threadKey: string) => boolean;
  anyArtisanUnread?: () => boolean;
  onThreadOpened?: (threadKey: string) => void;
}

export function DiscussionBlock({ ticket, artisans, emailTemplates, focusTab, onFocused, threadUnread, anyArtisanUnread, onThreadOpened }: Props) {
  const { addMessage, fetchTicketMessages } = useTickets();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (USE_SUPABASE) void fetchTicketMessages(ticket.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  // All artisans involved: from quotes, assigned artisan, or existing message threads
  const artisanIds = Array.from(new Set([
    ...(ticket.artisanId ? [ticket.artisanId] : []),
    ...ticket.quotes.map(q => q.artisanId).filter(Boolean),
    ...Object.keys(ticket.messages).filter(
      k => !STAKEHOLDER_KEYS.includes(k as StakeholderKey) && k !== "general",
    ),
  ]));

  const hasSyndic    = !!ticket.syndic || (ticket.messages["syndic"]?.length ?? 0) > 0;
  const hasAssurance = (ticket.messages["assurance"]?.length ?? 0) > 0;

  // Always show Locataire, Propriétaire, Artisans.
  // Show Syndic / Assurance only if there's a discussion.
  const visibleTabs: Array<StakeholderKey | "artisans"> = [
    "locataire", "proprietaire", "artisans",
    ...(hasSyndic    ? (["syndic"]    as const) : []),
    ...(hasAssurance ? (["assurance"] as const) : []),
  ];

  const [activeTab, setActiveTab]                 = useState<string>("locataire");
  const [selectedArtisanId, setSelectedArtisanId] = useState<string>(artisanIds[0] ?? "");

  // Les pièces jointes du mail initial (signalement) ne vivent pas dans
  // ticket_documents — elles sont dans ticket_mail_sources.attachments. On les
  // résout ici en URLs signées et on les injecte comme documents virtuels
  // rattachés au pseudo-message "mail-source-<ticketId>".
  const mailSourceMessageId = `mail-source-${ticket.id}`;
  const [initialAttachmentDocs, setInitialAttachmentDocs] = useState<TicketDocument[]>([]);
  useEffect(() => {
    const atts = ticket.mailSource?.attachments;
    if (!atts || atts.length === 0) { setInitialAttachmentDocs([]); return; }
    let cancelled = false;
    void (async () => {
      const resolved = await Promise.all(atts.map(async (a, i) => {
        const { data } = await supabase.storage.from("ticket-documents").createSignedUrl(a.storage_path, 3600);
        return {
          id: `mail-source-att-${ticket.id}-${i}`,
          ticket_id: ticket.id,
          document_type: "signalement",
          file_name: a.filename,
          file_url: data?.signedUrl ?? "",
          storage_path: a.storage_path,
          mime_type: a.content_type ?? undefined,
          file_size: a.size ?? undefined,
          uploaded_at: ticket.mailSource?.receivedAt ?? new Date().toISOString(),
          ticket_message_id: mailSourceMessageId,
        } as TicketDocument;
      }));
      if (!cancelled) setInitialAttachmentDocs(resolved.filter(d => d.file_url));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, ticket.mailSource?.attachments]);

  const mergedDocuments = useMemo(
    () => [...(ticket.documents ?? []), ...initialAttachmentDocs],
    [ticket.documents, initialAttachmentDocs],
  );

  useEffect(() => {
    if (artisanIds.length > 0 && !artisanIds.includes(selectedArtisanId)) {
      setSelectedArtisanId(artisanIds[0]);
    }
  }, [artisanIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focusTab) {
      setActiveTab(focusTab);
      onFocused?.();
    }
  }, [focusTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Un onglet visible = considéré comme lu. Marque l'onglet initial + à chaque changement
  // de ticket. Le changement d'onglet par clic est géré séparément dans Tabs.onValueChange.
  useEffect(() => {
    if (!onThreadOpened) return;
    const key = activeTab === "artisans" ? selectedArtisanId : activeTab;
    if (key) onThreadOpened(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);


  /** Return templates interpolated for this thread context */
  const getTemplates = (threadKey: string): EmailTemplate[] => {
    const stakeholder = STAKEHOLDER_TARGET[threadKey as StakeholderKey];
    const targetFilter: EmailTemplate["target"] = stakeholder ?? "artisan";
    const artisan = artisans.find(a => a.id === threadKey) ?? null;
    const vars = buildVars(ticket, artisan, settings.agency_name);

    const raw = emailTemplates.filter(t => t.target === targetFilter);
    return raw.map(t => ({
      ...t,
      subject: interpolate(t.subject, vars),
      body:    interpolate(t.body, vars),
    }));
  };

  const handleSend = (threadKey: string) => (content: string, subject: string, templateId?: string) => {
    addMessage(ticket.id, threadKey, content, "agence", subject, templateId);
  };

  const artisanName = (id: string): string =>
    artisans.find(a => a.id === id)?.nom ?? "Artisan";

  const lastSubject = (threadKey: string): string =>
    [...(ticket.messages[threadKey] ?? [])].reverse().find(m => m.subject)?.subject ?? "";

  const manageTemplatesItem: EmailTemplate = {
    id:      "__manage__",
    name:    "Gérer les modèles",
    target:  "artisan",
    useCase: "",
    subject: "",
    body:    "",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Discussions
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
          Retrouvez tous vos échanges par mail avec les personnes impliquées dans la résolution de ce dossier.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            // Sélectionner un onglet stakeholder = le marquer comme lu. Pour "artisans",
            // on marque le thread de l'artisan actuellement sélectionné dans le dropdown.
            if (!onThreadOpened) return;
            if (v === "artisans") {
              if (selectedArtisanId) onThreadOpened(selectedArtisanId);
            } else {
              onThreadOpened(v);
            }
          }}
        >
          <TabsList className="h-8 mb-3 gap-1">
            {visibleTabs.map(key => {
              const label = key === "artisans" ? "Artisans" : STAKEHOLDER_LABELS[key];
              const showDot = key === "artisans"
                ? (anyArtisanUnread?.() ?? false)
                : (threadUnread?.(key) ?? false);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="text-xs gap-1 relative"
                >
                  {STAKEHOLDER_ICONS[key]}
                  {label}
                  {showDot && (
                    <span
                      aria-label="Nouveau message non lu"
                      className="ml-0.5 h-2 w-2 rounded-full bg-destructive"
                    />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Stakeholder threads */}
          {(["locataire", "proprietaire", "syndic", "assurance"] as StakeholderKey[]).map(key => {
            const baseMessages = ticket.messages[key] ?? [];
            const threadMessages = key === "locataire" && ticket.mailSource
              ? [
                  {
                    id: mailSourceMessageId,
                    from: "locataire" as const,
                    content: ticket.mailSource.body,
                    subject: ticket.mailSource.subject,
                    timestamp: ticket.mailSource.receivedAt,
                  },
                  ...baseMessages,
                ]
              : baseMessages;
            return (
            <TabsContent key={key} value={key} className="mt-0">
              <DiscussionThread
                messages={threadMessages}
                templates={getTemplates(key)}
                onManageTemplates={() => navigate("/settings")}
                onSend={handleSend(key)}
                senderLabel="Vous"
                receiverLabel={STAKEHOLDER_LABELS[key]}
                defaultSubject={lastSubject(key)}
                documents={mergedDocuments}
              />
            </TabsContent>
            );
          })}

          {/* Artisans thread */}
          <TabsContent value="artisans" className="mt-0 space-y-3">
            {artisanIds.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Aucun artisan contacté pour l'instant.</p>
                <p className="text-xs text-muted-foreground mt-1">Les échanges apparaîtront ici une fois un artisan sollicité.</p>
              </div>
            ) : (
              <>
                {artisanIds.length > 1 && (
                  <Select
                    value={selectedArtisanId}
                    onValueChange={(id) => {
                      setSelectedArtisanId(id);
                      onThreadOpened?.(id);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Sélectionner un artisan…" />
                    </SelectTrigger>
                    <SelectContent>
                      {artisanIds.map(id => (
                        <SelectItem key={id} value={id}>
                          {artisanName(id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <DiscussionThread
                  messages={ticket.messages[selectedArtisanId] ?? []}
                  templates={getTemplates(selectedArtisanId)}
                  onManageTemplates={() => navigate("/settings")}
                  onSend={handleSend(selectedArtisanId)}
                  senderLabel="Vous"
                  receiverLabel={artisanName(selectedArtisanId)}
                  defaultSubject={lastSubject(selectedArtisanId)}
                  documents={mergedDocuments}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
