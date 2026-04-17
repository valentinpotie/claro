import type {
  AgencySettings,
  AIJournalEntry,
  Artisan,
  EmailTemplate,
  Quote,
  Responsabilite,
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from "@/data/types";
import { supabase } from "@/lib/supabase";

type DbTicket = {
  id: string;
  agency_id: string | null;
  source: string | null;
  inbound_email_id: string | null;
  reference: string;
  property_id: string | null;
  tenant_id: string | null;
  owner_id: string | null;
  syndic_id: string | null;
  assigned_artisan_id: string | null;
  selected_quote_id: string | null;
  property_address: string | null;
  property_unit: string | null;
  property_owner_name: string | null;
  property_owner_phone: string | null;
  property_owner_email: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_email: string | null;
  syndic_name: string | null;
  syndic_email: string | null;
  syndic_phone: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  is_urgent: boolean | null;
  responsibility: string | null;
  validation_status: string | null;
  title: string | null;
  description: string | null;
  planned_intervention_date: string | null;
  passage_confirmed: boolean | null;
  invoice_validated: boolean | null;
  reported_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DbQuote = {
  id: string;
  ticket_id: string;
  artisan_id: string | null;
  artisan_name_snapshot: string | null;
  amount: number | null;
  delay_text: string | null;
  description: string | null;
  is_selected: boolean | null;
};

type DbMessage = {
  id: string;
  ticket_id: string;
  artisan_id: string | null;
  recipient_type: string | null;
  from_role: string | null;
  content: string | null;
  subject: string | null;
  template_id: string | null;
  sent_at: string | null;
  created_at: string | null;
};

type DbPhoto = {
  id: string;
  ticket_id: string;
  file_url: string | null;
};

type DbNote = {
  id: string;
  ticket_id: string;
  content: string | null;
};

type DbMailSource = {
  id: string;
  ticket_id: string;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  body: string | null;
  received_at: string | null;
};

type DbSyndicFollowup = {
  id: string;
  ticket_id: string;
  number: number | null;
  sent_at: string | null;
};

type DbInvoice = {
  id: string;
  ticket_id: string;
  artisan_id: string | null;
  amount: number | null;
  is_paid: boolean | null;
  invoice_ref: string | null;
  invoice_date: string | null;
  description: string | null;
};

type DbJournalEntry = {
  id: string;
  ticket_id: string;
  type: string | null;
  status: string | null;
  message: string | null;
  occurred_at: string | null;
  created_at: string | null;
};

type DbAgency = {
  id: string;
  name: string | null;
  code: string | null;
  email_inbound: string | null;
};

type DbAgencySettings = {
  id: string;
  agency_id: string;
  delegation_threshold: number | null;
  always_ask_owner: boolean | null;
  escalation_delay_days: number | null;
  escalation_delay_owner_days: number | null;
  escalation_delay_artisan_days: number | null;
  escalation_delay_tenant_days: number | null;
  escalation_reminders_count: number | null;
  accountant_email: string | null;
  enabled_priorities: unknown;
  onboarding_completed: boolean | null;
  tour_completed: boolean | null;
};

type DbEmailTemplate = {
  id: string;
  agency_id: string;
  name: string | null;
  target: string | null;
  use_case: string | null;
  subject: string | null;
  body: string | null;
  is_active: boolean | null;
};

type DbArtisan = {
  id: string;
  agency_id: string;
  name: string | null;
  specialties: string[] | null;
  city: string | null;
  address: string | null;
  rating: number | string | null;
  interventions_count: number | null;
  average_delay: string | null;
  phone: string | null;
  email: string | null;
};

const statusFromDb: Record<string, TicketStatus> = {
  reported: "signale",
  signale: "signale",
  qualified: "qualifie",
  qualifie: "qualifie",
  contact_artisan: "contact_artisan",
  contractor_contacted: "contact_artisan",
  artisan_contacted: "contact_artisan",
  reception_devis: "reception_devis",
  quote_received: "reception_devis",
  validation_proprio: "validation_proprio",
  owner_validation: "validation_proprio",
  intervention: "intervention",
  confirmation_passage: "confirmation_passage",
  passage_confirmation: "confirmation_passage",
  passage_confirmed: "confirmation_passage",
  facturation: "facturation",
  billing: "facturation",
  cloture: "cloture",
  closed: "cloture",
  contact_syndic: "contact_syndic",
  syndic_contact: "contact_syndic",
  relance_syndic: "relance_syndic",
  syndic_followup: "relance_syndic",
  escalade_syndic: "escalade_syndic",
  syndic_escalation: "escalade_syndic",
  resolution_syndic: "resolution_syndic",
  syndic_resolved: "resolution_syndic",
};

const statusToDb: Record<TicketStatus, string> = {
  signale: "reported",
  qualifie: "qualified",
  contact_artisan: "contractor_contacted",
  reception_devis: "quote_received",
  validation_proprio: "owner_validation",
  intervention: "intervention",
  confirmation_passage: "passage_confirmed",
  facturation: "billing",
  cloture: "closed",
  contact_syndic: "syndic_contact",
  relance_syndic: "syndic_followup",
  escalade_syndic: "syndic_escalation",
  resolution_syndic: "syndic_resolved",
};

const priorityFromDb: Record<string, TicketPriority> = {
  urgent: "urgente",
  urgente: "urgente",
  high: "haute",
  haute: "haute",
  normal: "normale",
  normale: "normale",
  low: "basse",
  basse: "basse",
};

const priorityToDb: Record<TicketPriority, string> = {
  urgente: "urgent",
  haute: "high",
  normale: "normal",
  basse: "low",
};

const categoryFromDb: Record<string, TicketCategory> = {
  plomberie: "plomberie",
  plumbing: "plomberie",
  electricite: "electricite",
  electricity: "electricite",
  electrical: "electricite",
  serrurerie: "serrurerie",
  locksmith: "serrurerie",
  chauffage: "chauffage",
  heating: "chauffage",
  toiture: "toiture",
  roof: "toiture",
  roofing: "toiture",
  humidite: "humidite",
  humidity: "humidite",
  nuisibles: "nuisibles",
  pests: "nuisibles",
  autre: "autre",
  other: "autre",
  painting: "autre",
};

const categoryToDb: Record<TicketCategory, string> = {
  plomberie: "plumbing",
  electricite: "electrical",
  serrurerie: "locksmith",
  chauffage: "heating",
  toiture: "roofing",
  humidite: "humidity",
  nuisibles: "pests",
  autre: "other",
};

const responsibilityFromDb: Record<string, Responsabilite> = {
  tenant: "locataire",
  locataire: "locataire",
  owner: "proprietaire",
  proprietaire: "proprietaire",
  shared: "partagee",
  partagee: "partagee",
  syndic: "syndic",
};

const responsibilityToDb: Record<Responsabilite, string> = {
  locataire: "tenant",
  proprietaire: "owner",
  partagee: "shared",
  syndic: "syndic",
};

const validationFromDb: Record<string, Ticket["validationStatus"]> = {
  pending: "en_attente",
  en_attente: "en_attente",
  approved: "approuve",
  approuve: "approuve",
  rejected: "refuse",
  refused: "refuse",
  refuse: "refuse",
};

const validationToDb: Record<NonNullable<Ticket["validationStatus"]>, string> = {
  en_attente: "pending",
  approuve: "approved",
  refuse: "refused",
};

const journalTypeFromDb: Record<string, AIJournalEntry["type"]> = {
  analysis: "analysis",
  message_sent: "message_sent",
  notification: "notification",
  action: "action",
  validation: "validation",
  matching: "matching",
  escalation: "escalation",
  reminder: "reminder",
  status_change: "status_change",
};

const journalStatusFromDb: Record<string, AIJournalEntry["status"]> = {
  pending: "pending",
  in_progress: "in_progress",
  done: "done",
  failed: "failed",
};

const templateTargetFromDb: Record<string, EmailTemplate["target"]> = {
  artisan: "artisan",
  tenant: "locataire",
  locataire: "locataire",
  owner: "proprietaire",
  proprietaire: "proprietaire",
  syndic: "syndic",
};

const templateTargetToDb: Record<EmailTemplate["target"], string> = {
  artisan: "artisan",
  locataire: "tenant",
  proprietaire: "owner",
  syndic: "syndic",
};

function toTicketStatus(value: string | null | undefined): TicketStatus {
  return statusFromDb[value ?? ""] ?? "signale";
}

function toTicketPriority(value: string | null | undefined): TicketPriority {
  return priorityFromDb[value ?? ""] ?? "normale";
}

function toTicketCategory(value: string | null | undefined): TicketCategory {
  return categoryFromDb[value ?? ""] ?? "autre";
}

function toResponsabilite(value: string | null | undefined): Responsabilite | undefined {
  if (!value) return undefined;
  return responsibilityFromDb[value] ?? undefined;
}

function toValidationStatus(value: string | null | undefined): Ticket["validationStatus"] | undefined {
  if (!value) return undefined;
  return validationFromDb[value] ?? undefined;
}

function toTicketMessageFromRole(value: string | null | undefined): TicketMessage["from"] {
  return value === "artisan" ? "artisan" : "agence";
}

function toTicketSource(value: string | null | undefined): Ticket["source"] {
  if (!value) return undefined;
  if (value === "email") return "email";
  if (value === "manual") return "manual";
  if (value === "phone") return "phone";
  return "other";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asTicketPriorities(value: unknown): TicketPriority[] {
  const priorities = asStringArray(value)
    .map((item) => priorityFromDb[item])
    .filter((item): item is TicketPriority => Boolean(item));
  return priorities.length > 0 ? priorities : ["urgente", "haute", "normale", "basse"];
}

export function mapArtisanRow(row: DbArtisan): Artisan {
  return {
    id: row.id,
    nom: row.name ?? "Artisan",
    specialites: row.specialties ?? [],
    ville: row.city ?? "",
    address: row.address ?? "",
    note: Number(row.rating ?? 0),
    interventions: row.interventions_count ?? 0,
    delaiMoyen: row.average_delay ?? "",
    telephone: row.phone ?? "",
    email: row.email ?? "",
  };
}

export function mapAgencySettings(
  agency: DbAgency | null,
  settingsRow: DbAgencySettings | null,
  templates: DbEmailTemplate[],
  fallback: AgencySettings,
): AgencySettings {
  return {
    id: settingsRow?.id ?? fallback.id,
    agency_id: settingsRow?.agency_id ?? agency?.id ?? fallback.agency_id,
    agency_name: agency?.name ?? fallback.agency_name,
    email_inbound: agency?.email_inbound ?? fallback.email_inbound,
    delegation_threshold: settingsRow?.delegation_threshold ?? fallback.delegation_threshold,
    always_ask_owner: settingsRow?.always_ask_owner ?? fallback.always_ask_owner,
    escalation_delay_owner_days: settingsRow?.escalation_delay_owner_days ?? settingsRow?.escalation_delay_days ?? fallback.escalation_delay_owner_days,
    escalation_delay_artisan_days: settingsRow?.escalation_delay_artisan_days ?? settingsRow?.escalation_delay_days ?? fallback.escalation_delay_artisan_days,
    escalation_delay_tenant_days: settingsRow?.escalation_delay_tenant_days ?? settingsRow?.escalation_delay_days ?? fallback.escalation_delay_tenant_days,
    escalation_reminders_count:
      settingsRow?.escalation_reminders_count ?? fallback.escalation_reminders_count,
    onboarding_completed: settingsRow?.onboarding_completed ?? fallback.onboarding_completed,
    enabled_priorities: asTicketPriorities(settingsRow?.enabled_priorities ?? fallback.enabled_priorities),
    tour_completed: settingsRow?.tour_completed ?? fallback.tour_completed,
    accountant_email: settingsRow?.accountant_email ?? fallback.accountant_email,
    email_templates: (() => {
      const dbTemplates = templates
        .filter((template) => template.is_active !== false)
        .map((template) => ({
          id: template.id,
          name: template.name ?? "Template",
          target: templateTargetFromDb[template.target ?? ""] ?? ("artisan" as EmailTemplate["target"]),
          useCase: template.use_case ?? "",
          subject: template.subject ?? "",
          body: template.body ?? "",
        }));
      if (dbTemplates.length === 0) return fallback.email_templates;
      // Merge: keep all DB templates, then append any default template whose useCase is not yet present
      const existingUseCases = new Set(dbTemplates.map(t => t.useCase));
      const missingDefaults = fallback.email_templates.filter(t => !existingUseCases.has(t.useCase));
      return [...dbTemplates, ...missingDefaults];
    })(),
  };
}

export async function fetchAgencyBundle(agencyId: string | null | undefined) {
  let resolvedAgencyId = agencyId ?? null;

  // Try to fetch settings — swallow RLS / permission errors gracefully.
  let settingsRow: DbAgencySettings | null = null;
  try {
    let settingsQuery = supabase.from("agency_settings").select("*");
    if (resolvedAgencyId) {
      settingsQuery = settingsQuery.eq("agency_id", resolvedAgencyId);
    } else {
      settingsQuery = settingsQuery.order("created_at", { ascending: true }).limit(1);
    }
    const { data: settingsRows, error: settingsError } = await settingsQuery;
    if (settingsError) console.warn("fetchAgencyBundle: settings query failed", settingsError.message);
    settingsRow = ((settingsRows as DbAgencySettings[] | null) ?? [])[0] ?? null;
    resolvedAgencyId = resolvedAgencyId ?? settingsRow?.agency_id ?? null;
  } catch {
    // swallow
  }

  let agency: DbAgency | null = null;
  try {
    if (resolvedAgencyId) {
      const { data: agencyRow, error: agencyError } = await supabase
        .from("agencies")
        .select("id, code, name, email_inbound")
        .eq("id", resolvedAgencyId)
        .maybeSingle();
      if (agencyError) console.warn("fetchAgencyBundle: agency query failed", agencyError.message);
      agency = (agencyRow as DbAgency | null) ?? null;
    } else {
      const { data: agencyRows, error: agencyError } = await supabase
        .from("agencies")
        .select("id, code, name, email_inbound")
        .order("created_at", { ascending: true })
        .limit(1);
      if (agencyError) console.warn("fetchAgencyBundle: agency discovery failed", agencyError.message);
      agency = ((agencyRows as DbAgency[] | null) ?? [])[0] ?? null;
      resolvedAgencyId = agency?.id ?? null;
    }
  } catch {
    // swallow
  }

  let templates: DbEmailTemplate[] = [];
  try {
    if (resolvedAgencyId) {
      const { data: templateRows, error: templateError } = await supabase
        .from("email_templates")
        .select("id, agency_id, name, target, use_case, subject, body, is_active")
        .eq("agency_id", resolvedAgencyId)
        .order("created_at", { ascending: true });
      if (templateError) console.warn("fetchAgencyBundle: templates query failed", templateError.message);
      templates = (templateRows as DbEmailTemplate[] | null) ?? [];
    }
  } catch {
    // swallow
  }

  return {
    agency,
    settings: settingsRow,
    templates,
  };
}

export async function fetchArtisansByAgency(agencyId: string | null | undefined) {
  let query = supabase
    .from("artisans")
    .select("id, agency_id, name, specialties, city, address, rating, interventions_count, average_delay, phone, email")
    .order("created_at", { ascending: true });

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data as DbArtisan[] | null) ?? []).map(mapArtisanRow);
}

function groupByTicketId<T extends { ticket_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    acc[row.ticket_id] = acc[row.ticket_id] ? [...acc[row.ticket_id], row] : [row];
    return acc;
  }, {});
}

export async function fetchTicketJournalEntries(ticketIds: string[]) {
  if (ticketIds.length === 0) return [] as AIJournalEntry[];

  const { data, error } = await supabase
    .from("ticket_journal_entries")
    .select("id, ticket_id, type, status, message, occurred_at, created_at")
    .in("ticket_id", ticketIds)
    .order("occurred_at", { ascending: true });

  if (error) throw error;

  return ((data as DbJournalEntry[] | null) ?? []).map((entry) => ({
    id: entry.id,
    ticketId: entry.ticket_id,
    timestamp: entry.occurred_at ?? entry.created_at ?? new Date().toISOString(),
    message: entry.message ?? "",
    type: journalTypeFromDb[entry.type ?? ""] ?? "action",
    status: journalStatusFromDb[entry.status ?? ""] ?? "done",
  }));
}

export async function fetchHydratedTickets(agencyId: string | null | undefined) {
  let ticketQuery = supabase.from("tickets").select("*").order("created_at", { ascending: false });
  if (agencyId) {
    ticketQuery = ticketQuery.eq("agency_id", agencyId);
  }

  const { data: ticketRows, error: ticketError } = await ticketQuery;
  if (ticketError) throw ticketError;

  const tickets = (ticketRows as DbTicket[] | null) ?? [];
  const ticketIds = tickets.map((ticket) => ticket.id);

  if (ticketIds.length === 0) {
    return { tickets: [] as Ticket[], journalEntries: [] as AIJournalEntry[] };
  }

  const tenantIds = [...new Set(tickets.map(t => t.tenant_id).filter(Boolean))] as string[];
  const ownerIds  = [...new Set(tickets.map(t => t.owner_id).filter(Boolean))]  as string[];

  const [quoteRes, messageRes, photoRes, noteRes, mailRes, followupRes, invoiceRes, journalEntries, tenantRes, ownerRes] = await Promise.all([
    supabase
      .from("ticket_quotes")
      .select("id, ticket_id, artisan_id, artisan_name_snapshot, amount, delay_text, description, is_selected")
      .in("ticket_id", ticketIds),
    supabase
      .from("ticket_messages")
      .select("id, ticket_id, artisan_id, recipient_type, from_role, content, subject, template_id, sent_at, created_at")
      .in("ticket_id", ticketIds)
      .order("sent_at", { ascending: true }),
    supabase
      .from("ticket_photos")
      .select("id, ticket_id, file_url")
      .in("ticket_id", ticketIds)
      .order("position", { ascending: true }),
    supabase
      .from("ticket_notes")
      .select("id, ticket_id, content")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("ticket_mail_sources")
      .select("id, ticket_id, from_email, to_email, subject, body, received_at")
      .in("ticket_id", ticketIds),
    supabase
      .from("ticket_syndic_followups")
      .select("id, ticket_id, number, sent_at")
      .in("ticket_id", ticketIds)
      .order("number", { ascending: true }),
    supabase
      .from("ticket_invoices")
      .select("id, ticket_id, artisan_id, amount, is_paid, invoice_ref, invoice_date, description")
      .in("ticket_id", ticketIds),
    fetchTicketJournalEntries(ticketIds),
    tenantIds.length > 0
      ? supabase.from("tenants").select("id, first_name, last_name, phone, email").in("id", tenantIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length > 0
      ? supabase.from("owners").select("id, first_name, last_name, phone, email").in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (quoteRes.error) throw quoteRes.error;
  if (messageRes.error) throw messageRes.error;
  if (photoRes.error) throw photoRes.error;
  if (noteRes.error) throw noteRes.error;
  if (mailRes.error) throw mailRes.error;
  if (followupRes.error) throw followupRes.error;
  if (invoiceRes.error) throw invoiceRes.error;

  type TenantRow = { id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null };
  type OwnerRow  = { id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null };
  const tenantsById = Object.fromEntries(((tenantRes.data ?? []) as TenantRow[]).map(r => [r.id, r]));
  const ownersById  = Object.fromEntries(((ownerRes.data  ?? []) as OwnerRow[]) .map(r => [r.id, r]));

  const quotesByTicket = groupByTicketId((quoteRes.data as DbQuote[] | null) ?? []);
  const messagesByTicket = groupByTicketId((messageRes.data as DbMessage[] | null) ?? []);
  const photosByTicket = groupByTicketId((photoRes.data as DbPhoto[] | null) ?? []);
  const notesByTicket = groupByTicketId((noteRes.data as DbNote[] | null) ?? []);
  const mailsByTicket = groupByTicketId((mailRes.data as DbMailSource[] | null) ?? []);
  const followupsByTicket = groupByTicketId((followupRes.data as DbSyndicFollowup[] | null) ?? []);
  const invoicesByTicket = groupByTicketId((invoiceRes.data as DbInvoice[] | null) ?? []);

  const mappedTickets = tickets.map((ticket) => {
    const quotes: Quote[] = (quotesByTicket[ticket.id] ?? []).map((quote) => ({
      id: quote.id,
      artisanId: quote.artisan_id ?? "",
      artisanNom: quote.artisan_name_snapshot ?? "Artisan",
      montant: quote.amount ?? 0,
      delai: quote.delay_text ?? "",
      description: quote.description ?? "",
      selected: quote.is_selected ?? false,
    }));

    const recipientTypeToLocal: Record<string, string> = {
      tenant: "locataire", owner: "proprietaire", syndic: "syndic", insurance: "assurance",
    };

    const messages = (messagesByTicket[ticket.id] ?? []).reduce<Record<string, TicketMessage[]>>((acc, message) => {
      const key = message.artisan_id ?? recipientTypeToLocal[message.recipient_type ?? ""] ?? message.recipient_type ?? "general";
      const nextMessage: TicketMessage = {
        id: message.id,
        from: toTicketMessageFromRole(message.from_role),
        content: message.content ?? "",
        subject: message.subject ?? undefined,
        template_id: message.template_id ?? undefined,
        timestamp: message.sent_at ?? message.created_at ?? new Date().toISOString(),
      };
      acc[key] = acc[key] ? [...acc[key], nextMessage] : [nextMessage];
      return acc;
    }, {});

    const invoice = (invoicesByTicket[ticket.id] ?? [])[0];
    const mailSource = (mailsByTicket[ticket.id] ?? [])[0];

    return {
      id: ticket.id,
      reference: ticket.reference,
      source: toTicketSource(ticket.source),
      inbound_email_id: ticket.inbound_email_id ?? undefined,
      titre: ticket.title ?? "Ticket",
      description: ticket.description ?? "",
      status: toTicketStatus(ticket.status),
      priorite: toTicketPriority(ticket.priority),
      categorie: toTicketCategory(ticket.category),
      dateCreation: (ticket.reported_at ?? ticket.created_at ?? new Date().toISOString()).slice(0, 10),
      dateMaj: (ticket.updated_at ?? ticket.created_at ?? new Date().toISOString()).slice(0, 10),
      urgence: ticket.is_urgent ?? false,
      locataire: (() => {
        const t = ticket.tenant_id ? tenantsById[ticket.tenant_id] : null;
        return {
          nom:       t ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() || (ticket.tenant_name ?? "") : (ticket.tenant_name ?? ""),
          telephone: t?.phone  ?? ticket.tenant_phone ?? "",
          email:     t?.email  ?? ticket.tenant_email ?? "",
        };
      })(),
      bien: (() => {
        const o = ticket.owner_id ? ownersById[ticket.owner_id] : null;
        return {
          adresse:       ticket.property_address ?? "",
          lot:           ticket.property_unit ?? "",
          proprietaire:  o ? `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || (ticket.property_owner_name ?? "") : (ticket.property_owner_name ?? ""),
          telephoneProprio: o?.phone ?? ticket.property_owner_phone ?? "",
          emailProprio:     o?.email ?? ticket.property_owner_email ?? "",
        };
      })(),
      responsabilite: toResponsabilite(ticket.responsibility),
      quotes,
      selectedQuoteId: ticket.selected_quote_id ?? quotes.find((quote) => quote.selected)?.id,
      messages,
      dateInterventionPrevue: ticket.planned_intervention_date ?? undefined,
      passageConfirme: ticket.passage_confirmed ?? undefined,
      facture: invoice
        ? {
            montant: invoice.amount ?? 0,
            payee: invoice.is_paid ?? false,
            refFacture: invoice.invoice_ref ?? undefined,
            dateFacture: invoice.invoice_date ?? undefined,
            prestation: invoice.description ?? undefined,
          }
        : undefined,
      factureValidee: ticket.invoice_validated ?? undefined,
      artisanId: ticket.assigned_artisan_id ?? undefined,
      tenant_id: ticket.tenant_id ?? undefined,
      property_id: ticket.property_id ?? undefined,
      owner_id: ticket.owner_id ?? undefined,
      photos: (photosByTicket[ticket.id] ?? []).map((photo) => photo.file_url ?? "").filter(Boolean),
      notes: (notesByTicket[ticket.id] ?? []).map((note) => note.content ?? "").filter(Boolean),
      validationStatus: toValidationStatus(ticket.validation_status),
      mailSource: mailSource
        ? {
            from: mailSource.from_email ?? "",
            to: mailSource.to_email ?? "",
            subject: mailSource.subject ?? "",
            body: mailSource.body ?? "",
            receivedAt: mailSource.received_at ?? new Date().toISOString(),
          }
        : undefined,
      syndic: ticket.syndic_name || ticket.syndic_email || ticket.syndic_phone
        ? {
            nom: ticket.syndic_name ?? "",
            email: ticket.syndic_email ?? "",
            telephone: ticket.syndic_phone ?? "",
          }
        : undefined,
      syndicRelances: (followupsByTicket[ticket.id] ?? []).map((followup) => ({
        date: (followup.sent_at ?? new Date().toISOString()).slice(0, 10),
        numero: followup.number ?? 0,
      })),
      syndicEscalade: toTicketStatus(ticket.status) === "escalade_syndic",
      disponibilitesArtisan: [],
      disponibilitesLocataire: [],
      documents: [],
    } satisfies Ticket;
  });

  return { tickets: mappedTickets, journalEntries };
}

export function mapStatusToDb(status: TicketStatus) {
  return statusToDb[status] ?? status;
}

export function mapPriorityToDb(priority: TicketPriority) {
  return priorityToDb[priority] ?? priority;
}

export function mapCategoryToDb(category: TicketCategory) {
  return categoryToDb[category] ?? category;
}

export function mapResponsabiliteToDb(responsabilite: Responsabilite | undefined) {
  return responsabilite ? responsibilityToDb[responsabilite] ?? responsabilite : null;
}

export function mapValidationToDb(status: Ticket["validationStatus"] | undefined) {
  return status ? validationToDb[status] ?? status : null;
}

export function mapTemplateTargetToDb(target: EmailTemplate["target"]) {
  return templateTargetToDb[target] ?? target;
}

export function mapDbTicketToTicket(dbTicket: DbTicket): Ticket {
  return {
    id: dbTicket.id,
    reference: dbTicket.reference || "",
    source: toTicketSource(dbTicket.source),
    inbound_email_id: dbTicket.inbound_email_id || undefined,
    titre: dbTicket.title || "",
    description: dbTicket.description || "",
    status: (dbTicket.status as TicketStatus) || "signale",
    priorite: (dbTicket.priority as TicketPriority) || "normale",
    categorie: (dbTicket.category as TicketCategory) || "autre",
    dateCreation: dbTicket.reported_at || new Date().toISOString(),
    dateMaj: dbTicket.updated_at || new Date().toISOString(),
    urgence: dbTicket.is_urgent || false,
    locataire: {
      nom: dbTicket.tenant_name || "",
      telephone: dbTicket.tenant_phone || "",
      email: dbTicket.tenant_email || "",
    },
    bien: {
      adresse: dbTicket.property_address || "",
      lot: dbTicket.property_unit || "",
      proprietaire: dbTicket.property_owner_name || "",
      telephoneProprio: dbTicket.property_owner_phone || "",
      emailProprio: dbTicket.property_owner_email || "",
    },
    artisanId: dbTicket.assigned_artisan_id || undefined,
    tenant_id: dbTicket.tenant_id || undefined,
    property_id: dbTicket.property_id || undefined,
    owner_id: dbTicket.owner_id || undefined,
    quotes: [],
    messages: {},
    photos: [],
    notes: [],
    documents: [],
    disponibilitesArtisan: [],
    disponibilitesLocataire: [],
    validationStatus: (dbTicket.validation_status as Ticket["validationStatus"]) || "en_attente",
    created_at: dbTicket.created_at || new Date().toISOString(),
  };
}
