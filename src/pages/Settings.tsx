import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { EmailTemplate } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Euro, Shield, Mail, Wrench, User, Home, Inbox, Copy, CheckCircle2, Building2 } from "lucide-react";
import { EscalationDelaySettings } from "@/components/EscalationDelaySettings";

const templateVariables = ["{{nom_agence}}", "{{adresse}}", "{{lot}}", "{{categorie}}", "{{description}}", "{{nom_artisan}}", "{{telephone_artisan}}", "{{nom_locataire}}", "{{telephone_locataire}}", "{{nom_proprietaire}}", "{{montant}}", "{{date_intervention}}"];

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [inboundCopied, setInboundCopied] = useState(false);

  const handleCopyInboundEmail = () => {
    if (!settings.email_inbound?.trim()) return;
    navigator.clipboard.writeText(settings.email_inbound).then(() => {
      setInboundCopied(true);
      setTimeout(() => setInboundCopied(false), 2000);
    });
  };

  const updateTemplate = (id: string, data: Partial<EmailTemplate>) => {
    const updated = settings.email_templates.map(t => t.id === id ? { ...t, ...data } : t);
    updateSettings({ email_templates: updated });
  };

  const renderTemplates = (target: "artisan" | "locataire" | "proprietaire" | "syndic") => {
    const templates = settings.email_templates.filter(t => t.target === target);
    return (
      <div className="max-h-[480px] overflow-y-auto space-y-3 pr-1">
        {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun template pour cette catégorie</p>}
        {templates.map(t => (
          <div key={t.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.name}</p>
              <Badge variant="secondary" className="text-[10px]">{t.useCase}</Badge>
            </div>
            {editingTemplate === t.id ? (
              <div className="space-y-2">
                <Input value={t.subject} onChange={e => updateTemplate(t.id, { subject: e.target.value })} className="text-sm" placeholder="Objet du mail" />
                <Textarea value={t.body} onChange={e => updateTemplate(t.id, { body: e.target.value })} rows={6} className="text-sm font-mono" placeholder="Corps du mail" />
                <div className="flex flex-wrap gap-1">
                  {templateVariables.map(v => (
                    <Badge key={v} variant="outline" className="text-[9px] font-mono cursor-pointer hover:bg-muted" onClick={() => {
                      updateTemplate(t.id, { body: t.body + v });
                    }}>{v}</Badge>
                  ))}
                </div>
                <button onClick={() => setEditingTemplate(null)} className="text-xs text-primary hover:underline">Fermer</button>
              </div>
            ) : (
              <div className="cursor-pointer" onClick={() => setEditingTemplate(t.id)}>
                <p className="text-xs text-muted-foreground">Objet : {t.subject}</p>
                <p className="text-xs text-muted-foreground truncate">Corps : {t.body.slice(0, 80)}…</p>
                <p className="text-[10px] text-primary mt-1">Cliquer pour modifier</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration des règles de gestion de l'agence</p>
      </div>

      {/* Règles de gestion */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Règles de gestion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Section 1 — Seuil de délégation */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Seuil de délégation</p>
              <p className="text-xs text-muted-foreground">En dessous de ce montant, le gestionnaire peut valider un devis sans demander l'accord du propriétaire.</p>
            </div>
            {!settings.always_ask_owner && (
              <div className="relative">
                <Input
                  type="number" min={0} step={50}
                  value={settings.delegation_threshold}
                  onChange={e => updateSettings({ delegation_threshold: Number(e.target.value) })}
                  className="pl-8 pr-16"
                  placeholder="Seuil de délégation (€)"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/60 pointer-events-none">TTC</span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-[4px] border border-input p-3">
              <div>
                <p className="text-sm font-medium">Toujours demander l'accord propriétaire</p>
                <p className="text-xs text-muted-foreground">Chaque devis devra être approuvé par le propriétaire</p>
              </div>
              <Switch checked={settings.always_ask_owner} onCheckedChange={checked => updateSettings({ always_ask_owner: checked })} />
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 2 — Relances automatiques */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Relances automatiques</p>
            </div>
            <EscalationDelaySettings settings={settings} onChange={updateSettings} />
          </div>
        </CardContent>
      </Card>

      {/* Templates d'emails */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" /> Templates d'emails</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Personnalisez les emails envoyés automatiquement. Utilisez les variables entre doubles accolades.</p>
          <Tabs defaultValue="artisan">
            <TabsList className="h-8 mb-3">
              <TabsTrigger value="artisan" className="text-xs gap-1"><Wrench className="h-3 w-3" /> Artisans</TabsTrigger>
              <TabsTrigger value="locataire" className="text-xs gap-1"><User className="h-3 w-3" /> Locataires</TabsTrigger>
              <TabsTrigger value="proprietaire" className="text-xs gap-1"><Home className="h-3 w-3" /> Propriétaires</TabsTrigger>
              <TabsTrigger value="syndic" className="text-xs gap-1"><Building2 className="h-3 w-3" /> Syndic</TabsTrigger>
            </TabsList>
            <TabsContent value="artisan">{renderTemplates("artisan")}</TabsContent>
            <TabsContent value="locataire">{renderTemplates("locataire")}</TabsContent>
            <TabsContent value="proprietaire">{renderTemplates("proprietaire")}</TabsContent>
            <TabsContent value="syndic">{renderTemplates("syndic")}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Email comptable */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Euro className="h-4 w-4" /> Comptabilité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input id="accountant-email" type="email" placeholder="Email du comptable (ex : comptable@agence.fr)" value={settings.accountant_email || ""} onChange={e => updateSettings({ accountant_email: e.target.value })} />
          <p className="text-xs text-muted-foreground">Les factures validées pourront être envoyées directement à cette adresse.</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Inbox className="h-4 w-4" /> Adresse de réception des signalements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted/40 border px-3 py-2 text-sm font-mono select-all">
              {settings.email_inbound?.trim() || "Adresse non configuree"}
            </code>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              onClick={handleCopyInboundEmail}
              disabled={!settings.email_inbound?.trim()}
            >
              {inboundCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {inboundCopied ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Transférez les emails de signalement à cette adresse pour créer automatiquement des tickets.</p>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-0 shadow-sm bg-primary/5">
        <CardContent className="p-4 text-sm space-y-1">
          <p className="font-medium">Résumé des règles actives</p>
          {settings.always_ask_owner ? (
            <p className="text-muted-foreground">L'accord du propriétaire est requis pour <strong>tous les devis</strong>, quel que soit le montant.</p>
          ) : (
            <p className="text-muted-foreground">Le gestionnaire peut valider les devis jusqu'à <strong>{settings.delegation_threshold} €</strong> sans accord du propriétaire.</p>
          )}
          <p className="text-muted-foreground">Relance automatique après <strong>{settings.escalation_delay_days} jour{settings.escalation_delay_days > 1 ? "s" : ""}</strong> sans réponse.</p>
          {settings.accountant_email && <p className="text-muted-foreground">Comptable : <strong>{settings.accountant_email}</strong></p>}
        </CardContent>
      </Card>
    </div>
  );
}
