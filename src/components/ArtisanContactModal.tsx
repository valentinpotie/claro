import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Wrench, User } from "lucide-react";
import { Artisan, Ticket, categoryLabels } from "@/data/types";
import { useSettings } from "@/contexts/SettingsContext";
import { buildTemplateVars, getAutoMessageContent, getAutoMessageSubject } from "@/lib/templateUtils";

export interface ArtisanContactPayload {
  artisan: { subject: string; content: string };
  tenant: { subject: string; content: string } | null;
}

interface Props {
  open: boolean;
  artisan: Artisan;
  ticket: Ticket;
  onConfirm: (payload: ArtisanContactPayload) => void;
  onClose: () => void;
}

export function buildArtisanContactMessage(
  artisan: Artisan,
  ticket: Ticket,
): { subject: string; content: string } {
  const category = categoryLabels[ticket.categorie] ?? ticket.categorie;
  return {
    subject: `Demande de déplacement — ${category} au ${ticket.bien.adresse}`,
    content: `Bonjour ${artisan.nom},\n\nNous avons un problème de ${category} au ${ticket.bien.adresse}.\n\nCoordonnées du locataire :\n- Nom : ${ticket.locataire.nom}\n- Téléphone : ${ticket.locataire.telephone}\n- Email : ${ticket.locataire.email}\n\nCoordonnées du propriétaire :\n- Nom : ${ticket.bien.proprietaire}\n- Téléphone : ${ticket.bien.telephoneProprio}\n- Email : ${ticket.bien.emailProprio}\n\nPouvez-vous vous déplacer pour faire un diagnostic sur place ?\n\nMerci.`,
  };
}

function buildTenantAckMessage(artisan: Artisan, ticket: Ticket): { subject: string; content: string } {
  const category = categoryLabels[ticket.categorie] ?? ticket.categorie;
  return {
    subject: `Votre signalement a bien été pris en compte — ${ticket.bien.adresse}`,
    content: `Bonjour ${ticket.locataire.nom},\n\nNous avons bien reçu votre signalement concernant un problème de ${category} au ${ticket.bien.adresse}.\n\nNous avons contacté ${artisan.nom} pour qu'il se déplace et établisse un devis. Vous serez tenu informé de la suite.\n\nCordialement.`,
  };
}

const ARTISAN_USE_CASE = "auto:artisan_demande_devis";
const TENANT_USE_CASE = "auto:locataire_signalement_recu";

export function ArtisanContactModal({ open, artisan, ticket, onConfirm, onClose }: Props) {
  const { settings } = useSettings();
  const [artisanSubject, setArtisanSubject] = useState("");
  const [artisanContent, setArtisanContent] = useState("");
  const [tenantSubject, setTenantSubject] = useState("");
  const [tenantContent, setTenantContent] = useState("");
  const [notifyTenant, setNotifyTenant] = useState(true);

  const canNotifyTenant = !!ticket.locataire.email;

  useEffect(() => {
    if (!open) return;
    // Source de vérité = templates de l'agence (Settings). Les "build*" restent en
    // fallback au cas où l'agence n'aurait pas le template (edge case imports).
    const vars = buildTemplateVars(ticket, artisan, settings.agency_name);
    const templates = settings.email_templates ?? [];
    const artisanFallback = buildArtisanContactMessage(artisan, ticket);
    const tenantFallback = buildTenantAckMessage(artisan, ticket);
    setArtisanSubject(getAutoMessageSubject(templates, ARTISAN_USE_CASE, vars, artisanFallback.subject));
    setArtisanContent(getAutoMessageContent(templates, ARTISAN_USE_CASE, vars, artisanFallback.content));
    setTenantSubject(getAutoMessageSubject(templates, TENANT_USE_CASE, vars, tenantFallback.subject));
    setTenantContent(getAutoMessageContent(templates, TENANT_USE_CASE, vars, tenantFallback.content));
    setNotifyTenant(canNotifyTenant);
  }, [open, artisan.id, ticket.id, canNotifyTenant, settings.email_templates, settings.agency_name]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSend = artisanContent.trim().length > 0 && (!notifyTenant || tenantContent.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Contact artisan
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-0.5">
            Email à l'artisan pour un diagnostic sur place. Optionnellement, prévenez le locataire que sa demande est prise en charge.
          </p>
        </DialogHeader>

        <Tabs defaultValue="artisan">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="artisan" className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Artisan — {artisan.nom}
            </TabsTrigger>
            <TabsTrigger value="tenant" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Locataire — {ticket.locataire.nom}
              {!notifyTenant && <span className="text-[10px] text-muted-foreground">(off)</span>}
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
            <p className="text-[11px] text-muted-foreground">Envoyé à {artisan.email}</p>
          </TabsContent>

          <TabsContent value="tenant" className="space-y-3 pt-3">
            {!canNotifyTenant ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Le locataire n'a pas d'email renseigné, aucune notification ne sera envoyée.
              </p>
            ) : (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={notifyTenant} onCheckedChange={(v) => setNotifyTenant(v === true)} />
                  <span className="text-sm">Prévenir le locataire que sa demande est prise en charge</span>
                </label>
                {notifyTenant && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Objet</Label>
                      <Input value={tenantSubject} onChange={(e) => setTenantSubject(e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Message</Label>
                      <Textarea value={tenantContent} onChange={(e) => setTenantContent(e.target.value)} rows={8} className="text-sm resize-none" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Envoyé à {ticket.locataire.email}</p>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() =>
              onConfirm({
                artisan: { subject: artisanSubject.trim(), content: artisanContent.trim() },
                tenant: notifyTenant && canNotifyTenant
                  ? { subject: tenantSubject.trim(), content: tenantContent.trim() }
                  : null,
              })
            }
            disabled={!canSend}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Envoyer {notifyTenant && canNotifyTenant ? "(2)" : "(1)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
