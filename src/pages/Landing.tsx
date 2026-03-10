import { Link } from "react-router-dom";
import { 
  HardHat, ArrowRight, AlertTriangle, Clock, Users, Eye, 
  CheckCircle, Droplets, Flame, DoorOpen, Shield, Zap,
  FileText, BarChart3, Wrench, ChevronRight, Mail, Phone, MessageSquare
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
              Vos sinistres et travaux,{" "}
              <span className="text-primary">enfin sous contrôle.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              SinistreFlow centralise, qualifie et pilote chaque demande de travaux — du signalement locataire à la clôture du dossier. Moins de charge, plus de visibilité.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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

      {/* Problème */}
      <section id="probleme" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Le constat</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              La gestion des sinistres, c'est encore le chaos.
            </h2>
            <p className="text-muted-foreground text-lg">
              Chaque jour, les agences perdent du temps à courir après l'information. Le résultat&nbsp;: des dossiers qui traînent, des locataires frustrés, des propriétaires dans le flou.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Mail, title: "Demandes dispersées", desc: "Les signalements arrivent par e-mail, téléphone, SMS, courrier… Impossible de tout centraliser." },
              { icon: FileText, title: "Informations incomplètes", desc: "Photos manquantes, adresses imprécises, descriptions floues. On passe son temps à relancer." },
              { icon: AlertTriangle, title: "Priorisation à l'aveugle", desc: "Sans scoring, tout est urgent ou rien ne l'est. Les vrais urgences passent à la trappe." },
              { icon: Users, title: "Coordination laborieuse", desc: "Artisans, locataires, propriétaires : chacun attend l'autre. Les allers-retours s'accumulent." },
              { icon: Clock, title: "Validations qui traînent", desc: "Attendre l'accord du propriétaire pour chaque devis ralentit tout le processus." },
              { icon: Eye, title: "Aucune visibilité", desc: "Où en est le dossier ? Qui fait quoi ? Impossible de répondre sans fouiller dans ses e-mails." },
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
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">La solution</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Une plateforme qui structure tout, automatiquement.
            </h2>
            <p className="text-muted-foreground text-lg">
              SinistreFlow transforme chaque signalement en un dossier structuré, qualifié et piloté de bout en bout.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: FileText, title: "Centralisation", desc: "Toutes les demandes au même endroit, structurées dès la réception." },
              { icon: Zap, title: "Qualification intelligente", desc: "Catégorisation automatique, scoring d'urgence et prédiction de responsabilité." },
              { icon: Wrench, title: "Routing artisans", desc: "Le bon artisan est identifié et contacté automatiquement selon le type d'incident." },
              { icon: CheckCircle, title: "Validation propriétaire", desc: "Envoi automatique des devis pour approbation, suivi en temps réel." },
              { icon: BarChart3, title: "Suivi complet", desc: "Chaque dossier est traçable de la demande initiale à la clôture." },
              { icon: Shield, title: "Gestion assurance", desc: "Identification automatique des sinistres éligibles, constitution du dossier." },
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
      <section id="fonctionnement" className="py-20 md:py-28 bg-muted/30">
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
              { step: "02", title: "Qualification", desc: "La plateforme qualifie, score l'urgence et prédit la responsabilité." },
              { step: "03", title: "Pilotage", desc: "L'agence valide, contacte l'artisan et obtient l'accord du propriétaire." },
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
      <section id="benefices" className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Résultats</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ce que ça change pour votre agence.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Gain de temps", desc: "Moins de ressaisie, moins de relances, moins d'appels. Chaque dossier avance seul." },
              { title: "Zéro oubli", desc: "Chaque demande est tracée. Rien ne tombe entre les mailles du filet." },
              { title: "Priorisation claire", desc: "L'urgence est scorée automatiquement. Vous traitez ce qui compte en premier." },
              { title: "Vision complète", desc: "Tableau de bord centralisé avec l'état de chaque dossier en temps réel." },
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
      <section className="py-20 md:py-28 bg-muted/30">
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
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Conçu avec les professionnels de l'immobilier.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-3">
              SinistreFlow a été pensé à partir d'échanges concrets avec des gestionnaires locatifs, des responsables d'agence et des administrateurs de biens.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Chaque fonctionnalité répond à un irritant réel du terrain. Pas de théorie, pas de gadget — uniquement ce qui fait gagner du temps au quotidien.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Prêt à simplifier votre gestion&nbsp;?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8">
              Découvrez comment SinistreFlow peut transformer la gestion de vos sinistres et travaux. Accédez à la démo en un clic.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={DEMO_URL}>
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold gap-2">
                  Accéder à la démo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="mailto:contact@sinistreflow.fr">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  Demander une démo personnalisée
                </Button>
              </a>
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
