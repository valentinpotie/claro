import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { useTickets } from "@/contexts/TicketContext";
import { Artisan } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  HardHat, ArrowRight, ArrowLeft, Check, Building2, Settings2, Wrench, Rocket,
  Plus, Trash2, Star, Phone, Mail,
} from "lucide-react";

const STEPS = [
  { key: "agence", label: "Votre agence", icon: Building2 },
  { key: "regles", label: "Règles de gestion", icon: Settings2 },
  { key: "artisans", label: "Artisans de confiance", icon: Wrench },
  { key: "done", label: "C'est prêt !", icon: Rocket },
];

const specialites = [
  "Plomberie", "Électricité", "Serrurerie", "Chauffage",
  "Toiture/Étanchéité", "Menuiserie", "Maçonnerie", "Autre",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { settings, updateSettings, completeOnboarding } = useSettings();
  const { artisans, addArtisan } = useTickets();

  const [step, setStep] = useState(0);

  // Étape 1 — Agence
  const [agencyName, setAgencyName] = useState(settings.agency_name || "");

  // Étape 2 — Règles
  const [threshold, setThreshold] = useState(settings.delegation_threshold);
  const [alwaysAsk, setAlwaysAsk] = useState(settings.always_ask_owner);
  const [escalationDays, setEscalationDays] = useState(settings.escalation_delay_days);
  const [reminders, setReminders] = useState(settings.escalation_reminders_count);

  // Étape 2 — Artisans
  const [newArtisan, setNewArtisan] = useState<Omit<Artisan, "id">>({
    nom: "", specialite: "Plomberie", ville: "", telephone: "", email: "",
    note: 5, interventions: 0, delaiMoyen: "48h",
  });
  const [showForm, setShowForm] = useState(false);

  const goNext = () => {
    if (step === 0) {
      updateSettings({ agency_name: agencyName.trim() || "Mon Agence" });
    }
    if (step === 1) {
      updateSettings({ delegation_threshold: threshold, always_ask_owner: alwaysAsk, escalation_delay_days: escalationDays, escalation_reminders_count: reminders });
    }
    setStep(s => s + 1);
  };

  const goBack = () => setStep(s => s - 1);

  const handleAddArtisan = () => {
    if (!newArtisan.nom.trim()) return;
    addArtisan(newArtisan);
    setNewArtisan({ nom: "", specialite: "Plomberie", ville: "", telephone: "", email: "", note: 5, interventions: 0, delaiMoyen: "48h" });
    setShowForm(false);
  };

  const handleFinish = () => {
    completeOnboarding();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <HardHat className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">Claro</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? "bg-primary text-primary-foreground" : done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-4 ${i < step ? "bg-success/40" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg">

        {/* Étape 0 — Agence */}
        {step === 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Bienvenue sur Claro</CardTitle>
              <p className="text-sm text-muted-foreground">Configurons ensemble votre espace de gestion des sinistres et travaux.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Nom de votre agence</Label>
                <Input
                  value={agencyName}
                  onChange={e => setAgencyName(e.target.value)}
                  placeholder="Ex : Agence Durand"
                  autoFocus
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={goNext} className="gap-2">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 1 — Règles */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Règles de gestion</CardTitle>
              <p className="text-sm text-muted-foreground">Ces règles définissent quand votre gestionnaire peut agir sans accord du propriétaire.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Toujours demander l'accord propriétaire</p>
                  <p className="text-xs text-muted-foreground">Chaque devis devra être approuvé par le propriétaire</p>
                </div>
                <Switch checked={alwaysAsk} onCheckedChange={setAlwaysAsk} />
              </div>

              {!alwaysAsk && (
                <div className="space-y-2">
                  <Label>Seuil de délégation (€)</Label>
                  <div className="relative">
                    <Input
                      type="number" min={0} step={50}
                      value={threshold}
                      onChange={e => setThreshold(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  </div>
                  <p className="text-xs text-muted-foreground">En dessous de ce montant, le gestionnaire peut valider sans accord propriétaire</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Délai d'escalade (jours)</Label>
                  <Input type="number" min={1} value={escalationDays} onChange={e => setEscalationDays(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Relances avant escalade</Label>
                  <Input type="number" min={1} value={reminders} onChange={e => setReminders(Number(e.target.value))} />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button onClick={goNext} className="gap-2">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2 — Artisans */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Vos artisans de confiance</CardTitle>
              <p className="text-sm text-muted-foreground">Ces artisans seront proposés en priorité lors du contact artisan. Vous pourrez en ajouter d'autres plus tard.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Liste artisans */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {artisans.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.nom}</p>
                      <p className="text-xs text-muted-foreground">{a.specialite} · {a.ville}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {a.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulaire ajout */}
              {showForm ? (
                <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nouvel artisan</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Input placeholder="Nom / raison sociale" value={newArtisan.nom} onChange={e => setNewArtisan(p => ({ ...p, nom: e.target.value }))} />
                    </div>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={newArtisan.specialite}
                      onChange={e => setNewArtisan(p => ({ ...p, specialite: e.target.value }))}
                    >
                      {specialites.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Input placeholder="Ville" value={newArtisan.ville} onChange={e => setNewArtisan(p => ({ ...p, ville: e.target.value }))} />
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input placeholder="Téléphone" value={newArtisan.telephone} onChange={e => setNewArtisan(p => ({ ...p, telephone: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input placeholder="Email" value={newArtisan.email} onChange={e => setNewArtisan(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                    <Button size="sm" onClick={handleAddArtisan} disabled={!newArtisan.nom.trim()}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" /> Ajouter un artisan
                </Button>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={goBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button onClick={goNext} className="gap-2">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 3 — Done */}
        {step === 3 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">
                  {settings.agency_name || agencyName || "Votre agence"} est prête !
                </h2>
                <p className="text-sm text-muted-foreground">Voici un résumé de votre configuration.</p>
              </div>

              <div className="text-left space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Agence</span>
                  <span className="font-medium">{settings.agency_name || agencyName}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Seuil de délégation</span>
                  <span className="font-medium">{settings.always_ask_owner ? "Toujours accord propriétaire" : `${settings.delegation_threshold} €`}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Escalade après</span>
                  <span className="font-medium">{settings.escalation_delay_days} jours · {settings.escalation_reminders_count} relances</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Artisans configurés</span>
                  <span className="font-medium">{artisans.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleFinish} size="lg" className="gap-2">
                  Accéder au tableau de bord <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> Modifier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
