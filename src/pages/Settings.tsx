import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings as SettingsIcon, Euro, Bell, Shield } from "lucide-react";

export default function Settings() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration des règles de gestion de l'agence</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Règles de gestion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seuil de délégation */}
          <div className="space-y-2">
            <Label htmlFor="threshold" className="flex items-center gap-2">
              <Euro className="h-3.5 w-3.5" /> Seuil de délégation
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="threshold"
                type="number"
                min={0}
                step={50}
                value={settings.delegation_threshold}
                onChange={e => updateSettings({ delegation_threshold: Number(e.target.value) })}
                className="w-32"
                disabled={settings.always_ask_owner}
              />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
            <p className="text-xs text-muted-foreground">
              En dessous de ce montant, le gestionnaire peut valider les travaux sans accord du propriétaire.
            </p>
          </div>

          {/* Always ask owner */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Checkbox
              id="always-ask"
              checked={settings.always_ask_owner}
              onCheckedChange={checked => updateSettings({ always_ask_owner: checked === true })}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="always-ask" className="text-sm font-medium cursor-pointer">
                Toujours demander l'accord du propriétaire quel que soit le montant
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Si activé, le seuil de délégation est ignoré et l'étape « Accord propriétaire » s'affiche systématiquement.
              </p>
            </div>
          </div>

          {/* Délai d'escalade */}
          <div className="space-y-2">
            <Label htmlFor="delay" className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" /> Délai d'escalade
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="delay"
                type="number"
                min={1}
                value={settings.escalation_delay_days}
                onChange={e => updateSettings({ escalation_delay_days: Number(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">jours</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Si le propriétaire ne répond pas après ce délai et {settings.escalation_reminders_count} relances, le gestionnaire peut valider en autonomie.
            </p>
          </div>

          {/* Nombre de relances */}
          <div className="space-y-2">
            <Label htmlFor="reminders" className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" /> Nombre de relances avant escalade
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="reminders"
                type="number"
                min={1}
                value={settings.escalation_reminders_count}
                onChange={e => updateSettings({ escalation_reminders_count: Number(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">relances</span>
            </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
