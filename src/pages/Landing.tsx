import { Link } from "react-router-dom";
import { 
  HardHat, ArrowRight, AlertTriangle, Clock, Users, Eye, 
  CheckCircle, Droplets, Flame, DoorOpen, Shield, Zap,
  FileText, BarChart3, Wrench, ChevronRight, Mail, TrendingDown, Timer, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMO_URL = "/dashboard";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">SinistreFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#probleme" className="hover:text-foreground transition-colors">Le problème</a>
            <a href="#solution" className="hover:text-foreground transition-colors">Solution</a>
            <a href="#fonctionnement" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#benefices" className="hover:text-foreground transition-colors">Bénéfices</a>
          </nav>
          <Link to={DEMO_URL}>
            <Button variant="outline" size="sm" className="font-medium">
              Connexion
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 md:px-8 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Conçu pour les agences immobilières françaises
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Reprenez le contrôle sur la gestion de{" "}
              <span className="text-primary">vos sinistres et travaux.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Aujourd'hui, chaque incident locatif peut vous prendre jusqu'à <strong className="text-foreground">45 à 60 minutes</strong> de gestion&nbsp;: relances, coordination artisans, validation propriétaire, suivi du dossier.
              <br className="hidden md:block" />
              <span className="mt-2 block">Avec SinistreFlow, tout est structuré automatiquement — du signalement locataire à la clôture du dossier.</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link to={DEMO_URL}>
                <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2">
                  Découvrir la plateforme
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={DEMO_URL}>
                <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium">
                  Connexion
                </Button>
              </Link>
            </div>

            {/* Chiffres clés hero */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              {[
                { value: "–60 %", label: "de temps de gestion par incident" },
                { value: "0", label: "demande perdue" },
                { value: "100 %", label: "de visibilité sur vos dossiers" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-black text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup */}
          <div className="mt-16 md:mt-20 max-w-5xl mx-auto">
            <div className="rounded-xl border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-muted rounded-md px-4 py-1 text-xs text-muted-foreground">
                    app.sinistreflow.fr
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8 bg-gradient-to-br from-background to-muted/30">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Dossiers ouverts", value: "24", color: "text-primary" },
                    { label: "En attente", value: "8", color: "text-warning" },
                    { label: "Interventions", value: "12", color: "text-accent" },
                    { label: "Clôturés ce mois", value: "47", color: "text-success" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border bg-card p-4">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {["Fuite d'eau — 12 rue Victor Hugo", "Chaudière en panne — 8 av. Gambetta", "Volet roulant bloqué — 3 pl. de la Mairie"].map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                      <span className="text-sm font-medium">{item}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        i === 0 ? "bg-destructive/10 text-destructive" : i === 1 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                      }`}>
                        {i === 0 ? "Urgent" : i === 1 ? "En cours" : "Planifié"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ce que les agences perdent aujourd'hui */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">Le coût caché</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Ce que votre agence perd aujourd'hui.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Chaque logement génère en moyenne <strong className="text-foreground">1 incident par an</strong>.
              <br />
              Pour une agence qui gère <strong className="text-foreground">400 lots</strong>, cela représente&nbsp;:
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            {[
              { value: "400", label: "incidents par an", icon: AlertTriangle },
              { value: "45 min", label: "de gestion par incident", icon: Timer },
              { value: "≈ 300 h", label: "de travail par an", icon: Clock },
              { value: "≈ 2 mois", label: "de travail gestionnaire", icon: TrendingDown },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card p-6 text-center hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-2xl md:text-3xl font-black text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-muted-foreground text-lg mb-4">Et pourtant, cette gestion reste&nbsp;:</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {["Dispersée", "Difficile à suivre", "Très chronophage"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {item}
                </span>
              ))}
            </div>
            <p className="text-lg font-semibold text-primary">
              SinistreFlow transforme ce chaos en workflow structuré.
            </p>
          </div>
        </div>
      </section>

      {/* Problème */}
      <section id="probleme" className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Le constat</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Pourquoi la gestion des sinistres vous fait perdre autant de temps.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Chaque incident déclenche une chaîne d'actions manuelles&nbsp;: qualifier le problème, récupérer les informations, contacter un artisan, demander un devis, attendre la validation du propriétaire, organiser le rendez-vous, suivre l'intervention, gérer la facture.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {[
              { icon: Mail, title: "Demandes dispersées", desc: "Les signalements arrivent par e-mail, téléphone, SMS… Vous passez votre temps à tout rassembler." },
              { icon: FileText, title: "Informations incomplètes", desc: "Photos manquantes, descriptions floues. Vous relancez constamment pour obtenir les détails." },
              { icon: AlertTriangle, title: "Priorisation à l'aveugle", desc: "Sans scoring, tout semble urgent. Les vraies urgences passent à la trappe." },
              { icon: Users, title: "Coordination laborieuse", desc: "Artisans, locataires, propriétaires : chacun attend l'autre. Les allers-retours s'accumulent." },
              { icon: Clock, title: "Validations qui traînent", desc: "Attendre l'accord du propriétaire pour chaque devis ralentit tout votre processus." },
              { icon: Eye, title: "Aucune visibilité", desc: "Où en est le dossier ? Qui fait quoi ? Impossible de répondre sans fouiller dans vos e-mails." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border-2 border-dashed border-destructive/20 bg-destructive/5 p-6 text-center">
              <p className="text-muted-foreground font-medium">
                <strong className="text-foreground">Résultat&nbsp;:</strong> des dossiers qui traînent, des relances constantes, un manque de visibilité et une forte charge mentale pour vos gestionnaires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">La solution</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Une plateforme qui fait avancer les dossiers à votre place.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              SinistreFlow transforme chaque signalement locataire en dossier structuré et piloté automatiquement.
              <br />
              <strong className="text-foreground">Vous ne gérez plus des e-mails ou des appels. Vous pilotez un workflow clair.</strong>
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: FileText, title: "Centralisation", desc: "Toutes les demandes arrivent dans un seul espace, structurées dès la réception." },
              { icon: Zap, title: "Diagnostic intelligent", desc: "La plateforme catégorise l'incident, évalue l'urgence et estime la responsabilité probable." },
              { icon: Wrench, title: "Routing artisans", desc: "Le bon artisan est identifié automatiquement selon le type d'incident et la localisation." },
              { icon: CheckCircle, title: "Accord propriétaire", desc: "Les devis sont envoyés automatiquement pour accord. Vous suivez les retours en temps réel." },
              { icon: BarChart3, title: "Suivi complet", desc: "Chaque dossier est traçable de la demande initiale à la clôture." },
              { icon: Shield, title: "Gestion assurance", desc: "Identification automatique des sinistres éligibles et constitution du dossier." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="fonctionnement" className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Fonctionnement</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              4 étapes. Zéro friction.
            </h2>
          </div>
          <div className="max-w-4xl mx-auto grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Signalement", desc: "Le locataire déclare son problème via un formulaire guidé avec photos." },
              { step: "02", title: "Diagnostic", desc: "La plateforme diagnostique le problème, évalue l'urgence et identifie la responsabilité." },
              { step: "03", title: "Pilotage", desc: "Vous validez, contactez l'artisan et obtenez l'accord du propriétaire." },
              { step: "04", title: "Clôture", desc: "Intervention réalisée, facture intégrée, dossier clôturé proprement." },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                <div className="text-5xl font-black text-primary/10 mb-3">{item.step}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                {i < 3 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-5 h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bénéfices */}
      <section id="benefices" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Résultats</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ce que SinistreFlow change pour votre agence.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Gain de temps", desc: "Jusqu'à 30 minutes économisées par incident. Moins de ressaisie, moins de relances." },
              { title: "Zéro oubli", desc: "Chaque demande est tracée automatiquement. Rien ne tombe entre les mailles du filet." },
              { title: "Priorisation claire", desc: "Les urgences sont identifiées automatiquement. Vous traitez ce qui compte en premier." },
              { title: "Vision complète", desc: "Un tableau de bord clair avec tous vos dossiers en cours, en un coup d'œil." },
              { title: "Coordination fluide", desc: "Artisans, propriétaires et locataires sont dans la boucle au bon moment." },
              { title: "Moins de charge mentale", desc: "Le workflow guide vos équipes étape par étape. Fini les post-it et les relances." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow">
                <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cas d'usage */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Cas d'usage</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Les sinistres du quotidien, traités sans effort.
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Droplets, label: "Fuite d'eau" },
              { icon: Flame, label: "Chauffage en panne" },
              { icon: DoorOpen, label: "Porte claquée" },
              { icon: Shield, label: "Dégât des eaux" },
              { icon: Wrench, label: "Volet bloqué" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Crédibilité */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Conçu avec les professionnels de l'immobilier.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-3">
              Conçu à partir d'échanges avec des gestionnaires locatifs et directeurs d'agences immobilières.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Chaque fonctionnalité répond à un irritant réel du terrain. Pas de théorie, pas de gadget — uniquement ce qui vous fait gagner du temps au quotidien.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Prêt à simplifier la gestion de vos sinistres&nbsp;?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8">
              Découvrez comment SinistreFlow peut transformer votre gestion des incidents locatifs. Accédez à la démo en un clic.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={DEMO_URL}>
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold gap-2">
                  Voir la démo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={DEMO_URL}>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  Connexion
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <HardHat className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">SinistreFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 SinistreFlow. Plateforme de gestion des sinistres et travaux pour agences immobilières.
          </p>
          <Link to={DEMO_URL} className="text-sm text-primary hover:underline font-medium">
            Connexion
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
