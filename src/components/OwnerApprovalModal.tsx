import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import { Ticket, Artisan, Quote, AgencySettings } from "@/data/types";
import { buildTemplateVars, getAutoMessageContent, getAutoMessageSubject } from "@/lib/templateUtils";

interface Props {
  open: boolean;
  ticket: Ticket;
  artisan: Artisan | null;
  quote: Quote;
  settings: AgencySettings;
  onConfirm: (subject: string, content: string, attachmentDocIds: string[]) => void;
  onClose: () => void;
}

const USE_CASE = "auto:proprietaire_accord_devis";

export function OwnerApprovalModal({ open, ticket, artisan, quote, settings, onConfirm, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(new Set());

  // Attachments candidate list: devis + photos + "autre" docs available on the ticket.
  // Factures excluded (not relevant at approval stage).
  const attachmentCandidates = useMemo(
    () => ticket.documents.filter((d) => d.document_type === "devis" || d.document_type === "photo" || d.document_type === "autre"),
    [ticket.documents],
  );

  useEffect(() => {
    if (!open) return;
    const vars = buildTemplateVars(ticket, artisan ?? undefined, settings.agency_name);
    // Override a few vars that templateUtils can't derive from the base Ticket alone.
    vars.montant = String(quote.montant);
    vars.delai = quote.delai ?? "";
    vars.nom_artisan = artisan?.nom ?? quote.artisanNom ?? "";

    const templates = settings.email_templates ?? [];
    const defaultSubject = `Devis à approuver — ${ticket.bien.adresse}`;
    const defaultContent = `Bonjour ${ticket.bien.proprietaire || ""},\n\nSuite au signalement au ${ticket.bien.adresse}${ticket.bien.lot ? ` (${ticket.bien.lot})` : ""}, nous avons reçu un devis de ${vars.nom_artisan} pour un montant de ${quote.montant} €.\n\nDescription : ${ticket.description}\n\nMerci de nous confirmer votre accord dans les meilleurs délais.\n\nCordialement,\n${settings.agency_name}`;

    setSubject(getAutoMessageSubject(templates, USE_CASE, vars, defaultSubject));
    setContent(getAutoMessageContent(templates, USE_CASE, vars, defaultContent));
    // Default: devis checked, photos and autre unchecked (safer — proprio doesn't usually
    // want raw tenant photos unless the gestionnaire explicitly opts in).
    setSelectedAttachmentIds(new Set(attachmentCandidates.filter((d) => d.document_type === "devis").map((d) => d.id)));
  }, [open, ticket.id, artisan?.id, quote.id, quote.montant, quote.delai, settings.agency_name, settings.email_templates, ticket.bien.adresse, ticket.bien.lot, ticket.bien.proprietaire, ticket.description, quote.artisanNom, attachmentCandidates]);

  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const recipientName = ticket.bien.proprietaire || "le propriétaire";
  const recipientEmail = ticket.bien.emailProprio;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Demande d'accord à {recipientName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-0.5">
            Le devis de <span className="font-medium text-foreground">{quote.montant} €</span> dépasse le seuil de délégation
            {settings.delegation_threshold ? ` (${settings.delegation_threshold} €)` : ""}. Un email va être envoyé à{" "}
            <span className="font-medium text-foreground">{recipientName}</span>
            {recipientEmail ? (<> à <span className="font-medium text-foreground">{recipientEmail}</span></>) : null}. Vérifiez et modifiez le message si besoin.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Objet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="text-sm resize-none"
            />
          </div>

          {attachmentCandidates.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" /> Pièces jointes ({selectedAttachmentIds.size}/{attachmentCandidates.length})
              </Label>
              <div className="rounded-lg border divide-y">
                {attachmentCandidates.map((doc) => {
                  const checked = selectedAttachmentIds.has(doc.id);
                  const isImage = (doc.mime_type ?? "").startsWith("image/");
                  const Icon = isImage ? ImageIcon : FileText;
                  const typeLabel = doc.document_type === "devis" ? "Devis" : doc.document_type === "photo" ? "Photo" : doc.document_type === "facture" ? "Facture" : "Autre";
                  return (
                    <label
                      key={doc.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleAttachment(doc.id)} />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">{typeLabel}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} Ko` : ""}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => onConfirm(subject.trim(), content.trim(), Array.from(selectedAttachmentIds))}
            disabled={!content.trim() || !recipientEmail}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Envoyer au propriétaire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
