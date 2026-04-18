import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Wrench, User } from "lucide-react";
import { Ticket, Artisan, AgencySettings } from "@/data/types";
import { buildTemplateVars, getAutoMessageContent, getAutoMessageSubject } from "@/lib/templateUtils";

interface Props {
  open: boolean;
  ticket: Ticket;
  artisan: Artisan | null;
  settings: AgencySettings;
  aiSummary?: string;
  onConfirm: (overrides: { artisan: { subject: string; content: string }; tenant: { subject: string; content: string } }) => void;
  onClose: () => void;
}

const ARTISAN_USE_CASE = "auto:artisan_devis_valide";
const TENANT_USE_CASE = "auto:locataire_proprio_approuve";

export function OwnerResponseConfirmModal({ open, ticket, artisan, settings, aiSummary, onConfirm, onClose }: Props) {
  const [artisanSubject, setArtisanSubject] = useState("");
  const [artisanContent, setArtisanContent] = useState("");
  const [tenantSubject, setTenantSubject] = useState("");
  const [tenantContent, setTenantContent] = useState("");

  const selectedQuote = useMemo(
    () => ticket.quotes.find((q) => q.id === ticket.selectedQuoteId),
    [ticket.quotes, ticket.selectedQuoteId],
  );

  useEffect(() => {
    if (!open) return;
    const vars = buildTemplateVars(ticket, artisan ?? undefined, settings.agency_name);
    if (selectedQuote) {
      vars.montant = String(selectedQuote.montant);
      vars.delai = selectedQuote.delai ?? "";
      vars.nom_artisan = artisan?.nom ?? selectedQuote.artisanNom ?? "";
    }
    const templates = settings.email_templates ?? [];

    const artisanName = artisan?.nom ?? selectedQuote?.artisanNom ?? "";
    const montantText = selectedQuote ? `${selectedQuote.montant} €` : "";
    const artisanDefaultSubject = `Devis approuvé — ${ticket.bien.adresse}`;
    const artisanDefaultContent = `Bonjour ${artisanName},\n\nLe propriétaire a approuvé le devis${montantText ? ` de ${montantText}` : ""}. Merci de prendre contact avec le locataire ${ticket.locataire.nom} (${ticket.locataire.telephone}) pour convenir d'une date d'intervention au ${ticket.bien.adresse}.\n\nCordialement,\n${settings.agency_name}`;

    const tenantDefaultSubject = `Intervention confirmée — ${ticket.bien.adresse}`;
    const tenantDefaultContent = `Bonjour ${ticket.locataire.nom},\n\nL'intervention au ${ticket.bien.adresse} a été confirmée par le propriétaire. L'artisan ${artisanName} va prochainement prendre contact avec vous pour convenir d'une date de passage.\n\nCordialement,\n${settings.agency_name}`;

    setArtisanSubject(getAutoMessageSubject(templates, ARTISAN_USE_CASE, vars, artisanDefaultSubject));
    setArtisanContent(getAutoMessageContent(templates, ARTISAN_USE_CASE, vars, artisanDefaultContent));
    setTenantSubject(getAutoMessageSubject(templates, TENANT_USE_CASE, vars, tenantDefaultSubject));
    setTenantContent(getAutoMessageContent(templates, TENANT_USE_CASE, vars, tenantDefaultContent));
  }, [open, ticket, artisan, selectedQuote, settings]);

  const canSend = artisanContent.trim().length > 0 && tenantContent.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Confirmer l'accord propriétaire
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-0.5">
            {aiSummary
              ? <>Claude a détecté un accord du propriétaire : <span className="italic">« {aiSummary} »</span>. Vérifiez les deux messages qui seront envoyés.</>
              : <>Deux emails vont être envoyés : l'artisan et le locataire. Vérifiez et ajustez avant envoi.</>}
          </p>
        </DialogHeader>

        <Tabs defaultValue="artisan">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="artisan" className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Artisan{artisan?.nom ? ` — ${artisan.nom}` : ""}
            </TabsTrigger>
            <TabsTrigger value="tenant" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Locataire — {ticket.locataire.nom}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artisan" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Objet</Label>
              <Input value={artisanSubject} onChange={(e) => setArtisanSubject(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea value={artisanContent} onChange={(e) => setArtisanContent(e.target.value)} rows={10} className="text-sm resize-none" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Envoyé à {artisan?.email ?? "—"}
            </p>
          </TabsContent>

          <TabsContent value="tenant" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Objet</Label>
              <Input value={tenantSubject} onChange={(e) => setTenantSubject(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea value={tenantContent} onChange={(e) => setTenantContent(e.target.value)} rows={10} className="text-sm resize-none" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Envoyé à {ticket.locataire.email || "—"}
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => onConfirm({
              artisan: { subject: artisanSubject.trim(), content: artisanContent.trim() },
              tenant: { subject: tenantSubject.trim(), content: tenantContent.trim() },
            })}
            disabled={!canSend}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Confirmer et envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
