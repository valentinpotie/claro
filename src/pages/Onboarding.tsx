import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTickets } from "@/contexts/TicketContext";
import { Artisan } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EscalationDelaySettings } from "@/components/EscalationDelaySettings";

import { ArtisanFormFields, artisanSpecialtyLabels } from "@/components/ArtisanFormFields";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AgencySetupLoader } from "@/components/AgencySetupLoader";
import {
  HardHat, ArrowRight, ArrowLeft, Check, Building2, Settings2, Wrench, Rocket,
  Plus, Pencil, Inbox, Copy, CheckCircle2, Sparkles, LogOut,
} from "lucide-react";

// ── Email domain → agency name ───────────────────────────────────────────────

const CONSUMER_DOMAINS = new Set([
  'gmail.com','googlemail.com',
  'outlook.com','outlook.fr','hotmail.com','hotmail.fr','hotmail.co.uk',
  'live.com','live.fr','live.co.uk','msn.com','windowslive.com',
  'yahoo.com','yahoo.fr','yahoo.co.uk','yahoo.co.jp','yahoo.es','yahoo.it','yahoo.de','yahoo.com.br',
  'icloud.com','me.com','mac.com',
  'orange.fr','sfr.fr','wanadoo.fr','numericable.fr','neuf.fr',
  'free.fr','bbox.fr','club-internet.fr','alice.fr','laposte.net','voila.fr',
  'protonmail.com','proton.me','pm.me',
  'tutanota.com','tutanota.de','tuta.io',
  'mailfence.com',
  'gmx.com','gmx.fr','gmx.net','gmx.de','gmx.at','gmx.ch',
  'aol.com','aim.com','mail.com','email.com',
  'yandex.com','yandex.ru','mail.ru',
  'zoho.com','fastmail.com','fastmail.fm',
]);

function extractAgencyNameFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return null;
  const domain = email.slice(atIdx + 1).toLowerCase().trim();
  if (!domain) return null;
  if (CONSUMER_DOMAINS.has(domain)) return null;
  if (/^(gmail|yahoo|hotmail|live|outlook)\./i.test(domain)) return null;
  const parts = domain.split('.');
  if (parts.length < 2) return null;
  // penultimate segment = domain name without TLD (handles subdomain.domain.tld too)
  const slug = parts[parts.length - 2];
  if (!slug || slug.length < 2) return null;
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const logOnboarding = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log("[ONBOARDING]", ...args);
  }
};

const STEPS = [
  { key: "agence", label: "Votre agence", icon: Building2 },
  { key: "regles", label: "R\u00e8gles de gestion", icon: Settings2 },
  { key: "artisans", label: "Artisans de confiance", icon: Wrench },
  { key: "email", label: "Email Claro", icon: Inbox },
  { key: "done", label: "C'est prêt !", icon: Rocket },
];


function buildInboundEmail(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "agence"}@mail.claroimmo.fr`;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { settings, loading, updateSettings, completeOnboarding } = useSettings();
  const { profile, user, signOut } = useAuth();
  const emailDomainName = extractAgencyNameFromEmail(user?.email);
  const { addArtisan } = useTickets();
  // Keep artisans added during onboarding in local state.
  // We can't call addArtisan to DB yet — agency_id won't be a valid UUID until completeOnboarding().
  const [pendingArtisans, setPendingArtisans] = useState<Omit<Artisan, "id">[]>([]);

  const [step, setStep] = useState(() => {
    const savedStep = localStorage.getItem("onboardingStep");
    return savedStep ? parseInt(savedStep, 10) : 0;
  });

  // Étape 1 — Agence (pre-filled from professional email domain when available)
  const [agencyName, setAgencyName] = useState(() => emailDomainName ?? "");
  const agencyInputRef = useRef<HTMLInputElement>(null);

  // Étape 2 — Règles
  const [threshold, setThreshold] = useState(settings.delegation_threshold);
  const [alwaysAsk, setAlwaysAsk] = useState(settings.always_ask_owner);

  // Étape 2 — Artisans
  const [newArtisan, setNewArtisan] = useState<Omit<Artisan, "id">>({
    nom: "", specialites: [], ville: "", address: "", telephone: "", email: "",
    note: 5, interventions: 0, delaiMoyen: "48h",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingArtisanIndex, setEditingArtisanIndex] = useState<number | null>(null);
  const [editArtisanDraft, setEditArtisanDraft] = useState<Omit<Artisan, "id"> | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Only trust profile.agency_id (from DB/memory) — settings.agency_id can be stale localStorage
    const hasLinkedAgency = Boolean(
      profile?.agency_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profile.agency_id)
    );

    logOnboarding("redirect check", {
      loading,
      onboarding_completed: settings.onboarding_completed,
      hasLinkedAgency,
      profile_agency_id: profile?.agency_id ?? null,
      settings_agency_id: settings.agency_id,
    });

    // Don't auto-redirect while the setup loader animation is playing —
    // onExitDone() will call navigate() after the zoom-out finishes.
    if (finishing) return;

    if (settings.onboarding_completed && hasLinkedAgency) {
      logOnboarding("redirecting to dashboard");
      localStorage.removeItem("onboardingStep");
      navigate("/dashboard", { replace: true });
    }
  }, [loading, finishing, profile?.agency_id, settings.onboarding_completed, navigate]);

  const goNext = () => {
    if (step === 0) {
      const normalizedAgencyName = agencyName.trim() || "Mon Agence";
      updateSettings({
        agency_name: normalizedAgencyName,
        email_inbound: buildInboundEmail(normalizedAgencyName),
      });
    }
    if (step === 1) {
      updateSettings({ delegation_threshold: threshold, always_ask_owner: alwaysAsk });
    }
    const nextStep = step + 1;
    setStep(nextStep);
    localStorage.setItem("onboardingStep", nextStep.toString());
  };

  const goBack = () => {
    const prevStep = step - 1;
    setStep(prevStep);
    localStorage.setItem("onboardingStep", prevStep.toString());
  };

  const handleAddArtisan = () => {
    if (!newArtisan.nom.trim()) return;
    setPendingArtisans(prev => [...prev, newArtisan]);
    setNewArtisan({ nom: "", specialites: [], ville: "", address: "", telephone: "", email: "", note: 5, interventions: 0, delaiMoyen: "48h" });
    setShowForm(false);
  };

  const handleFinish = async () => {
    setFinishing(true); // mounts the loader overlay
    try {
      logOnboarding("handleFinish: starting completeOnboarding");
      const newAgencyId = await completeOnboarding();
      for (const a of pendingArtisans) {
        addArtisan(a, newAgencyId);
      }
      localStorage.removeItem("onboardingStep");
      logOnboarding("handleFinish: backend done, signalling loader");
      setSetupComplete(true); // loader triggers zoom-out then calls onExitDone → navigate
    } catch (err) {
      console.error("handleFinish: onboarding completion failed", err);
      setFinishing(false); // dismount loader so user can retry
    }
  };

  return (
    <>
      {finishing && (
        <AgencySetupLoader
          isComplete={setupComplete}
          onExitDone={() => navigate("/dashboard")}
        />
      )}
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-10 w-10 rounded-[4px] bg-secondary flex items-center justify-center">
          <HardHat className="h-5 w-5 text-secondary-foreground" />
        </div>
        <span className="text-xl font-bold font-display">Claro</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? "bg-primary/15 text-primary" : done ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"}`}>
                {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-4 ${i < step ? "bg-foreground/25" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg">

        {/* Étape 0 — Agence */}
        {step === 0 && (
          <Card className="border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Bienvenue sur Claro</CardTitle>
              <p className="text-sm text-muted-foreground">Configurons ensemble votre espace de gestion des sinistres et travaux.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Input
                  ref={agencyInputRef}
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Ex : Durand Immobilier"
                  autoFocus
                />
                {emailDomainName && agencyName === emailDomainName ? (
                  <p className="text-xs flex items-center gap-1 text-primary">
                    <Sparkles className="h-3 w-3" />
                    Pré-rempli depuis votre domaine professionnel, modifiez si nécessaire
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Saisissez le nom de votre agence.</p>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => goNext()} className="gap-2" disabled={!agencyName.trim()}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 1 — Règles */}
        {step === 1 && (
          <Card className="border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Règles de gestion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Section 1 — Seuil de délégation */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Seuil de délégation</p>
                  <p className="text-xs text-muted-foreground">En dessous de ce montant, le gestionnaire peut valider un devis sans demander l'accord du propriétaire.</p>
                </div>
                {!alwaysAsk && (
                  <div className="relative">
                    <Input
                      type="number" min={0} step={50}
                      value={threshold}
                      onChange={e => setThreshold(Number(e.target.value))}
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
                  <Switch checked={alwaysAsk} onCheckedChange={setAlwaysAsk} />
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

              <div className="flex justify-between">
                <Button variant="ghost" onClick={goBack} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-transparent">
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <Button onClick={() => goNext()} className="gap-2">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2 — Artisans */}
        {step === 2 && (
          <Card className="border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Vos artisans de confiance</CardTitle>
              <p className="text-sm text-muted-foreground">Ces artisans seront proposés en premier lors de la phase de contact d'un artisan. Vous pourrez en ajouter d'autres plus tard.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Liste artisans — résumé seul, form d'édition sorti du scroll */}
              {pendingArtisans.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {pendingArtisans.map((a, i) => editingArtisanIndex === i ? null : (
                    <div key={i} className="rounded-[4px] border border-input bg-muted/30 flex items-center justify-between px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.nom}</p>
                        <p className="text-xs text-muted-foreground">{a.specialites.map(s => artisanSpecialtyLabels[s] ?? s).join(", ") || "—"} · {a.ville}</p>
                      </div>
                      {editingArtisanIndex !== i && (
                        <button
                          className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => { setEditingArtisanIndex(i); setEditArtisanDraft({ ...a }); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire édition — hors du scroll, pleine largeur */}
              {editingArtisanIndex !== null && editArtisanDraft && (
                <div className="rounded-[4px] border border-input p-3 space-y-3 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground">Modifier l'artisan</p>
                  <ArtisanFormFields value={editArtisanDraft} onChange={setEditArtisanDraft} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingArtisanIndex(null); setEditArtisanDraft(null); }}>Annuler</Button>
                    <Button size="sm" className="rounded-[4px] bg-foreground text-background hover:bg-foreground/80"
                      onClick={() => {
                        setPendingArtisans(prev => prev.map((x, j) => j === editingArtisanIndex ? editArtisanDraft : x));
                        setEditingArtisanIndex(null);
                        setEditArtisanDraft(null);
                      }}
                      disabled={!editArtisanDraft.nom.trim()}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Enregistrer
                    </Button>
                  </div>
                </div>
              )}

              {/* Formulaire ajout — masqué quand édition en cours */}
              {editingArtisanIndex === null && (
                showForm ? (
                  <div className="rounded-[4px] border border-input p-3 space-y-3 bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">Nouvel artisan</p>
                    <ArtisanFormFields value={newArtisan} onChange={setNewArtisan} />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
                      <Button size="sm" className="rounded-[4px] bg-foreground text-background hover:bg-foreground/80" onClick={handleAddArtisan} disabled={!newArtisan.nom.trim()}>
                        Valider
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" className="w-full gap-2 rounded-[4px] bg-foreground text-background hover:bg-foreground/80" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Ajouter un artisan
                  </Button>
                )
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={goBack} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-transparent">
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={showForm || editingArtisanIndex !== null ? 0 : undefined}>
                        <Button
                          onClick={() => goNext()}
                          className="gap-2"
                          disabled={showForm || editingArtisanIndex !== null}
                        >
                          Suivant <ArrowRight className="h-4 w-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(showForm || editingArtisanIndex !== null) && (
                      <TooltipContent side="top">
                        L'ajout de l'artisan n'est pas terminé
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 3 — Email Claro */}
        {step === 3 && (() => {
          const claroEmail = settings.email_inbound?.trim() || buildInboundEmail(agencyName || settings.agency_name || "agence");
          const handleCopy = () => {
            navigator.clipboard.writeText(claroEmail).then(() => {
              setEmailCopied(true);
              setTimeout(() => setEmailCopied(false), 2000);
            });
          };
          return (
            <Card className="border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">Votre adresse email Claro</CardTitle>
                <p className="text-sm text-muted-foreground">Tous les emails envoyés à cette adresse génèreront automatiquement un nouveau signalement dans Claro.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Inbox className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">Votre adresse dédiée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-background border px-3 py-2 text-sm font-mono select-all">
                      {claroEmail}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
                      {emailCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      {emailCopied ? "Copié" : "Copier"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Comment ça marche ?</p>
                  <div className="space-y-1.5 text-muted-foreground text-xs">
                    <p>1. Un locataire vous signale un problème par email</p>
                    <p>2. Vous transférez cet email à <strong className="text-foreground">{claroEmail}</strong></p>
                    <p>3. Claro crée automatiquement un ticket avec toutes les informations</p>
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Astuce :</strong> Créez une règle de transfert automatique dans votre messagerie pour envoyer tous les emails de travaux directement à cette adresse.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={goBack} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-transparent">
                    <ArrowLeft className="h-4 w-4" /> Précédent
                  </Button>
                  <Button onClick={() => goNext()} className="gap-2">
                    Suivant <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Étape 4 — Done */}
        {step === 4 && (
          <Card className="border-0">
            <CardContent className="p-8 text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display mb-1">
                  {settings.agency_name || agencyName || "Votre agence"} est prête !
                </h2>
                <p className="text-sm text-muted-foreground">Voici un résumé de votre configuration.</p>
              </div>

              <div className="text-left space-y-2">
                <div className="flex items-center justify-between rounded-[4px] bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Agence</span>
                  <span className="font-medium">{settings.agency_name || agencyName}</span>
                </div>
                <div className="flex items-center justify-between rounded-[4px] bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Seuil de délégation</span>
                  <span className="font-medium">{settings.always_ask_owner ? "Toujours accord propriétaire" : `${settings.delegation_threshold} €`}</span>
                </div>
                <div className="flex items-center justify-between rounded-[4px] bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Délai de relances automatiques</span>
                  <span className="font-medium">{settings.escalation_delay_owner_days} j (proprio) · {settings.escalation_delay_artisan_days} j (artisan) · {settings.escalation_delay_tenant_days} j (locataire)</span>
                </div>
                <div className="flex items-center justify-between rounded-[4px] bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Artisans configurés</span>
                  <span className="font-medium">{pendingArtisans.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-[4px] bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Email Claro</span>
                  <span className="font-mono text-xs">{settings.email_inbound?.trim() || buildInboundEmail(agencyName || settings.agency_name || "agence")}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleFinish} size="lg" className="gap-2" disabled={finishing}>
                  Accéder au tableau de bord <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={goBack} className="gap-1 text-muted-foreground hover:text-foreground hover:bg-transparent">
                  <ArrowLeft className="h-3.5 w-3.5" /> Modifier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Logout discret */}
      <button
        onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}
        className="mt-8 mb-6 flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <LogOut className="h-3 w-3" /> Se déconnecter
      </button>
    </div>
    </>
  );
}
