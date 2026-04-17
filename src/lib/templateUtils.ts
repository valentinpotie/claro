import type { Ticket, Artisan, EmailTemplate } from "@/data/types";
import { categoryLabels } from "@/data/types";

/** Replaces {{variable}} placeholders with actual values. */
export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function buildTemplateVars(
  ticket: Ticket,
  artisan: Artisan | null | undefined,
  agencyName: string,
): Record<string, string> {
  const selectedQuote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId) ?? ticket.quotes.find(q => q.selected);
  return {
    nom_agence:               agencyName,
    adresse:                  ticket.bien.adresse,
    lot:                      ticket.bien.lot,
    categorie:                categoryLabels[ticket.categorie] ?? ticket.categorie,
    description:              ticket.description,
    nom_artisan:              artisan?.nom ?? selectedQuote?.artisanNom ?? "",
    telephone_artisan:        artisan?.telephone ?? "",
    nom_locataire:            ticket.locataire.nom,
    telephone_locataire:      ticket.locataire.telephone,
    nom_proprietaire:         ticket.bien.proprietaire,
    telephone_proprietaire:   ticket.bien.telephoneProprio,
    montant:                  selectedQuote ? `${selectedQuote.montant}` : (ticket.facture ? `${ticket.facture.montant}` : ""),
    date_intervention:        ticket.dateInterventionPrevue ?? "",
  };
}

/**
 * Returns the interpolated body of the template matching `useCase`,
 * or `fallback` if no template is found.
 */
export function getAutoMessageContent(
  templates: EmailTemplate[],
  useCase: string,
  vars: Record<string, string>,
  fallback: string,
): string {
  const tpl = templates.find(t => t.useCase === useCase);
  if (!tpl) return fallback;
  return interpolate(tpl.body, vars);
}

export function getAutoMessageSubject(
  templates: EmailTemplate[],
  useCase: string,
  vars: Record<string, string>,
  fallback: string,
): string {
  const tpl = templates.find(t => t.useCase === useCase);
  if (!tpl) return fallback;
  return interpolate(tpl.subject, vars);
}
