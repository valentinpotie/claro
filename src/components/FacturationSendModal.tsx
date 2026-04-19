import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Wrench, User, Home, Building2, Calculator, UserPlus, X, Plus, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { Ticket, Artisan, AgencySettings } from "@/data/types";
import { buildTemplateVars, getAutoMessageContent, getAutoMessageSubject } from "@/lib/templateUtils";

type Role = "artisan" | "tenant" | "owner" | "syndic" | "accountant" | `custom-${string}`;

interface RoleConfig {
  role: Role;
  label: string;
  shortLabel: string;
  icon: typeof Wrench;
  useCase: string;
  email: string;
  name: string;
  threadKey: string;
  /** Pour recipient_type=custom côté edge function (comptable, adresse libre). */
  overrideEmail?: string;
  overrideRoleTag?: string;
  defaultChecked: boolean;
}

export interface FacturationSendPayload {
  items: Array<{
    threadKey: string;
    useCase: string;
    subject: string;
    content: string;
    attachmentDocumentIds: string[];
    overrideEmail?: string;
    overrideName?: string;
    overrideRoleTag?: string;
  }>;
}

interface Props {
  open: boolean;
  ticket: Ticket;
  artisan: Artisan | null;
  settings: AgencySettings;
  onConfirm: (payload: FacturationSendPayload) => void;
  onClose: () => void;
}

/** Modale d'envoi de la facture & clôture. Défauts : seul le payeur (locataire ou
 *  propriétaire selon responsabilité) et la comptabilité (si email configuré) sont
 *  cochés. Les autres parties sont décochées — à activer explicitement si besoin.
 *  Possibilité d'ajouter des adresses libres (BCC ad-hoc) avant d'envoyer. */
export function FacturationSendModal({ open, ticket, artisan, settings, onConfirm, onClose }: Props) {
  // Le payeur dépend de la responsabilité (locataire/bailleur/propriétaire, etc.).
  const payerRole: "tenant" | "owner" =
    ticket.responsabilite === "locataire" ? "tenant" : "owner";

  // Adresses libres ajoutées par le gestionnaire avant envoi (ex. deuxième propriétaire,
  // expert-comptable externe). Chaque entrée devient un destinataire "custom".
  const [customEmails, setCustomEmails] = useState<Array<{ email: string; name: string }>>([]);
  const [customInput, setCustomInput] = useState("");

  const roles = useMemo<RoleConfig[]>(() => {
    const list: RoleConfig[] = [];
    // Ordre d'affichage : payeur en premier (défaut coché), puis comptable, puis les autres.
    if (ticket.locataire.email) list.push({
      role: "tenant", label: `Locataire — ${ticket.locataire.nom}`, shortLabel: "Locataire", icon: User,
      useCase: "auto:locataire_cloture",
      email: ticket.locataire.email, name: ticket.locataire.nom,
      threadKey: "locataire",
      defaultChecked: payerRole === "tenant",
    });
    if (ticket.bien.emailProprio) list.push({
      role: "owner", label: `Propriétaire — ${ticket.bien.proprietaire}`, shortLabel: "Propriétaire", icon: Home,
      useCase: "auto:proprietaire_facture",
      email: ticket.bien.emailProprio, name: ticket.bien.proprietaire,
      threadKey: "proprietaire",
      defaultChecked: payerRole === "owner",
    });
    if (settings.accountant_email) list.push({
      role: "accountant", label: `Comptabilité — ${settings.accountant_email}`, shortLabel: "Comptabilité", icon: Calculator,
      useCase: "auto:accountant_facture",
      email: settings.accountant_email, name: "Comptabilité",
      threadKey: `custom:${settings.accountant_email.toLowerCase()}`,
      overrideEmail: settings.accountant_email,
      overrideRoleTag: "accountant",
      defaultChecked: true,
    });
    if (artisan?.email) list.push({
      role: "artisan", label: `Artisan — ${artisan.nom}`, shortLabel: "Artisan", icon: Wrench,
      useCase: "auto:artisan_facture_payee",
      email: artisan.email, name: artisan.nom,
      threadKey: artisan.id,
      defaultChecked: false,
    });
    if (ticket.syndic?.email) list.push({
      role: "syndic", label: `Syndic — ${ticket.syndic.nom}`, shortLabel: "Syndic", icon: Building2,
      useCase: "auto:proprietaire_cloture",
      email: ticket.syndic.email, name: ticket.syndic.nom,
      threadKey: "syndic",
      defaultChecked: false,
    });
    // Emails libres ajoutés à la volée.
    for (const c of customEmails) {
      const roleKey: Role = `custom-${c.email.toLowerCase()}`;
      list.push({
        role: roleKey,
        label: `Autre — ${c.email}`,
        shortLabel: c.name || "Autre",
        icon: UserPlus,
        useCase: "auto:accountant_facture",
        email: c.email,
        name: c.name || c.email,
        threadKey: `custom:${c.email.toLowerCase()}`,
        overrideEmail: c.email,
        overrideName: c.name || undefined,
        overrideRoleTag: "custom",
        defaultChecked: true,
      } as RoleConfig & { overrideName?: string });
    }
    return list;
  }, [ticket, artisan, settings.accountant_email, payerRole, customEmails]);

  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(new Set());

  const attachmentCandidates = useMemo(
    () => ticket.documents.filter((d) => d.document_type !== "autre" || (d.file_name && d.file_name.length > 0)),
    [ticket.documents],
  );

  // Regénère les defaults quand on (ré)ouvre la modale OU quand la liste des rôles
  // change (ajout d'un custom email). On ne réinitialise QUE les rôles pas encore
  // touchés pour ne pas écraser un sujet/corps déjà édité.
  useEffect(() => {
    if (!open) return;
    const vars = buildTemplateVars(ticket, artisan ?? undefined, settings.agency_name);
    if (ticket.facture) vars.montant = String(ticket.facture.montant);
    const templates = settings.email_templates ?? [];

    setEnabled((prev) => {
      const next = { ...prev };
      for (const r of roles) if (next[r.role] === undefined) next[r.role] = r.defaultChecked;
      return next;
    });
    setSubjects((prev) => {
      const next = { ...prev };
      for (const r of roles) {
        if (next[r.role] === undefined) {
          next[r.role] = getAutoMessageSubject(templates, r.useCase, vars, `Facture — ${ticket.bien.adresse}`);
        }
      }
      return next;
    });
    setBodies((prev) => {
      const next = { ...prev };
      for (const r of roles) {
        if (next[r.role] === undefined) {
          next[r.role] = getAutoMessageContent(
            templates,
            r.useCase,
            vars,
            r.role === "accountant" || r.role.startsWith("custom-")
              ? `Bonjour,\n\nVous trouverez ci-joint la facture relative à l'intervention au ${ticket.bien.adresse}${ticket.bien.lot ? ` (${ticket.bien.lot})` : ""}.\n\nMontant : ${ticket.facture?.montant ?? "—"} €\nArtisan : ${artisan?.nom ?? "—"}\n\nCordialement,\n${settings.agency_name}`
              : `Bonjour,\n\nVous trouverez en pièce jointe la facture relative à l'intervention au ${ticket.bien.adresse}.\n\nCordialement,\n${settings.agency_name}`,
          );
        }
      }
      return next;
    });
    // Default attachments : factures uniquement.
    setSelectedAttachmentIds((prev) => prev.size > 0 ? prev : new Set(ticket.documents.filter((d) => d.document_type === "facture").map((d) => d.id)));
  }, [open, ticket, artisan, settings, roles]);

  const toggleRole = (role: string) => setEnabled((prev) => ({ ...prev, [role]: !prev[role] }));
  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addCustomEmail = () => {
    const email = customInput.trim();
    if (!email.includes("@")) return;
    if (customEmails.some(c => c.email.toLowerCase() === email.toLowerCase())) return;
    setCustomEmails(prev => [...prev, { email, name: "" }]);
    setCustomInput("");
  };
  const removeCustomEmail = (email: string) => {
    setCustomEmails(prev => prev.filter(c => c.email !== email));
  };

  const activeRoles = roles.filter((r) => enabled[r.role]);
  const canSend = activeRoles.length > 0 && activeRoles.every((r) => (bodies[r.role] ?? "").trim().length > 0);

  const defaultTab = (roles.find(r => r.defaultChecked) ?? roles[0])?.role ?? "tenant";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Envoi de la facture et clôture
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-0.5">
            Par défaut, la facture part au <span className="font-medium">{payerRole === "tenant" ? "locataire" : "propriétaire"}</span> (responsable du paiement)
            {settings.accountant_email && <> et à la <span className="font-medium">comptabilité</span></>}.
            Ajustez les destinataires avant envoi.
          </p>
        </DialogHeader>

        {/* Panneau d'overview des destinataires + ajout d'adresse libre */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label className="text-xs font-medium">Destinataires ({activeRoles.length})</Label>
          <div className="space-y-1.5">
            {roles.map(r => {
              const Icon = r.icon;
              const isChecked = enabled[r.role] ?? false;
              const isCustom = r.role.startsWith("custom-");
              return (
                <div
                  key={r.role}
                  onClick={() => toggleRole(r.role)}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors ${isChecked ? "bg-primary/10 border border-primary/30" : "bg-background border border-border/50"}`}
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleRole(r.role)} onClick={e => e.stopPropagation()} />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight truncate">{r.shortLabel}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                  </div>
                  {r.role === "accountant" && <span className="text-[10px] text-primary font-medium shrink-0">défaut</span>}
                  {((r.role === "tenant" && payerRole === "tenant") || (r.role === "owner" && payerRole === "owner")) && (
                    <span className="text-[10px] text-primary font-medium shrink-0">payeur</span>
                  )}
                  {isCustom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCustomEmail(r.email); }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      title="Retirer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <div className="flex gap-1.5 pt-1">
              <Input
                type="email"
                placeholder="Ajouter une adresse (expert-comptable, second proprio…)"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomEmail(); } }}
                className="h-7 text-xs"
              />
              <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0" disabled={!customInput.includes("@")} onClick={addCustomEmail}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucun destinataire avec email disponible.</p>
        ) : (
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(roles.length, 5)}, 1fr)` }}>
              {roles.slice(0, 5).map((r) => {
                const Icon = r.icon;
                return (
                  <TabsTrigger key={r.role} value={r.role} className="flex items-center gap-1.5 text-xs">
                    <Icon className="h-3 w-3" />
                    <span className="truncate">{r.shortLabel}</span>
                    {!enabled[r.role] && <span className="text-[9px] text-muted-foreground">(off)</span>}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {roles.map((r) => (
              <TabsContent key={r.role} value={r.role} className="space-y-3 pt-3">
                {enabled[r.role] ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Objet</Label>
                      <Input
                        value={subjects[r.role] ?? ""}
                        onChange={(e) => setSubjects((prev) => ({ ...prev, [r.role]: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Message envoyé à {r.name}</Label>
                      <Textarea
                        value={bodies[r.role] ?? ""}
                        onChange={(e) => setBodies((prev) => ({ ...prev, [r.role]: e.target.value }))}
                        rows={8}
                        className="text-sm resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-8 text-center">
                    {r.shortLabel} n'est pas coché — aucun email ne lui sera envoyé.
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {attachmentCandidates.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" /> Pièces jointes ({selectedAttachmentIds.size}/{attachmentCandidates.length})
            </Label>
            <p className="text-[11px] text-muted-foreground -mt-1">Les pièces sélectionnées seront jointes à tous les emails.</p>
            <div className="rounded-lg border divide-y max-h-48 overflow-auto">
              {attachmentCandidates.map((doc) => {
                const checked = selectedAttachmentIds.has(doc.id);
                const isImage = (doc.mime_type ?? "").startsWith("image/");
                const Icon = isImage ? ImageIcon : FileText;
                const typeLabel = doc.document_type === "devis" ? "Devis" : doc.document_type === "photo" ? "Photo" : doc.document_type === "facture" ? "Facture" : "Autre";
                return (
                  <label key={doc.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors">
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => {
              const attachmentIds = Array.from(selectedAttachmentIds);
              const items = activeRoles.map((r) => ({
                threadKey: r.threadKey,
                useCase: r.useCase,
                subject: (subjects[r.role] ?? "").trim(),
                content: (bodies[r.role] ?? "").trim(),
                attachmentDocumentIds: attachmentIds,
                overrideEmail: r.overrideEmail,
                overrideName: (r as RoleConfig & { overrideName?: string }).overrideName,
                overrideRoleTag: r.overrideRoleTag,
              }));
              onConfirm({ items });
            }}
            disabled={!canSend}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Envoyer ({activeRoles.length}) et clôturer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
