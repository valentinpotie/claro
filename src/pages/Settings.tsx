import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { TicketPriority, priorityLabels, EmailTemplate } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Euro, Bell, Shield, ListFilter, Mail, Wrench, User, Home } from "lucide-react";

const allPriorities: TicketPriority[] = ["urgente", "haute", "normale", "basse"];
const templateVariables = ["{{nom_agence}}", "{{adresse}}", "{{lot}}", "{{categorie}}", "{{description}}", "{{nom_artisan}}", "{{telephone_artisan}}", "{{nom_locataire}}", "{{telephone_locataire}}", "{{nom_proprietaire}}", "{{montant}}", "{{date_intervention}}"];

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  const updateTemplate = (id: string, data: Partial<EmailTemplate>) => {
    const updated = settings.email_templates.map(t => t.id === id ? { ...t, ...data } : t);
    updateSettings({ email_templates: updated });
  };

  const renderTemplates = (target: "artisan" | "locataire" | "proprietaire") => {
    const templates = settings.email_templates.filter(t => t.target === target);
    return (
      <div className="space-y-3">
        {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun template pour cette catégorie</p>}
        {templates.map(t => (
          <div key={t.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.name}</p>
              <Badge variant="secondary" className="text-[10px]">{t.useCase}</Badge>
            </div>
            {editingTemplate === t.id ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Objet</Label>
                  <Input value={t.subject} onChange={e => updateTemplate(t.id, { subject: e.target.value })} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Corps</Label>
                  <Textarea value={t.body} onChange={e => updateTemplate(t.id, { body: e.target.value })} rows={6} className="text-sm font-mono" />
                </div>
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration des règles de gestion de l'agence</p>
      </div>

      {/* Règles de gestion */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Règles de gestion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="threshold" className="flex items-center gap-2">
              <Euro className="h-3.5 w-3.5" /> Seuil de délégation
            </Label>
            <div className="flex items-center gap-2">
              <Input id="threshold" type="number" min={0} step={50} value={settings.delegation_threshold} onChange={e => updateSettings({ delegation_threshold: Number(e.target.value) })} className="w-32" disabled={settings.always_ask_owner} />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
            <p className="text-xs text-muted-foreground">En dessous de ce montant, le gestionnaire peut valider les travaux sans accord du propriétaire.</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Checkbox id="always-ask" checked={settings.always_ask_owner} onCheckedChange={checked => updateSettings({ always_ask_owner: checked === true })} className="mt-0.5" />
            <div>
              <Label htmlFor="always-ask" className="text-sm font-medium cursor-pointer">Toujours demander l'accord du propriétaire quel que soit le montant</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Si activé, le seuil de délégation est ignoré et l'étape « Accord propriétaire » s'affiche systématiquement.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay" className="flex items-center gap-2"><Bell className="h-3.5 w-3.5" /> Délai d'escalade</Label>
            <div className="flex items-center gap-2">
              <Input id="delay" type="number" min={1} value={settings.escalation_delay_days} onChange={e => updateSettings({ escalation_delay_days: Number(e.target.value) })} className="w-24" />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
            <p className="text-xs text-muted-foreground">Si le propriétaire ne répond pas après ce délai et {settings.escalation_reminders_count} relances, le gestionnaire peut valider en autonomie.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminders" className="flex items-center gap-2"><Bell className="h-3.5 w-3.5" /> Nombre de relances avant escalade</Label>
            <div className="flex items-center gap-2">
              <Input id="reminders" type="number" min={1} value={settings.escalation_reminders_count} onChange={e => updateSettings({ escalation_reminders_count: Number(e.target.value) })} className="w-24" />
              <span className="text-sm text-muted-foreground">relances</span>
            </div>
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
            </TabsList>
            <TabsContent value="artisan">{renderTemplates("artisan")}</TabsContent>
            <TabsContent value="locataire">{renderTemplates("locataire")}</TabsContent>
            <TabsContent value="proprietaire">{renderTemplates("proprietaire")}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Email comptable */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Euro className="h-4 w-4" /> Comptabilité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="accountant-email" className="text-xs">Email du comptable</Label>
            <Input id="accountant-email" type="email" placeholder="comptable@agence.fr" value={settings.accountant_email || ""} onChange={e => updateSettings({ accountant_email: e.target.value })} />
            <p className="text-xs text-muted-foreground">Les factures validées pourront être envoyées directement à cette adresse.</p>
          </div>
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
          <p className="text-muted-foreground">En cas de non-réponse : escalade après <strong>{settings.escalation_delay_days} jours</strong> et <strong>{settings.escalation_reminders_count} relances</strong>.</p>
          <p className="text-muted-foreground">Priorités actives : {(settings.enabled_priorities || allPriorities).map(p => priorityLabels[p]).join(", ") || "Aucune"}</p>
          {settings.accountant_email && <p className="text-muted-foreground">Comptable : <strong>{settings.accountant_email}</strong></p>}
        </CardContent>
      </Card>
    </div>
  );
}
