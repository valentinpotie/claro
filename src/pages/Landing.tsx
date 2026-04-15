import { Link } from "react-router-dom";
import { HardHat, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const CALENDAR_URL = "https://calendar.app.google/V73ZcSgq5vY7cDnk7";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[4px] bg-secondary flex items-center justify-center">
              <HardHat className="h-5 w-5 text-secondary-foreground" />
            </div>
            <span className="text-lg font-bold font-display tracking-tight">Claro</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          </nav>
          <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="font-medium">
              Se connecter
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="font-medium">
              Créer un compte
            </Button>
          </Link>
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="font-medium gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" /> Réserver une démo
            </Button>
          </a>
        </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 md:px-8 py-20 md:py-32 relative">
          <div className="flex flex-col gap-12">
            {/* Top: Text Content */}
            <div className="max-w-3xl mx-auto text-center w-full">
              <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Démo privée · Sur invitation uniquement
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display tracking-tight leading-[1.1] mb-6">
                Le pilote automatique{" "}
                <span className="text-primary">de vos interventions.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
                Chaque demande devient un ticket suivi. Vos interventions avancent d'elles-mêmes : artisans relancés, syndics coordonnés, propriétaires informés.
              </p>
              
              <div className="flex flex-col items-center gap-3 mb-12">
                <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2 bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))] focus-visible:ring-secondary/40">
                    <CalendarCheck className="h-4 w-4" />
                    Réserver une démo
                  </Button>
                </a>
                <p className="text-sm text-muted-foreground">Démo de 15 min avec l'équipe Claro</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                {[
                  { value: "–60 %", label: "de temps de gestion" },
                  { value: "0", label: "relance oubliée" },
                  { value: "+30 %", label: "satisfaction client" },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <div className="text-3xl md:text-4xl font-black font-display text-primary">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: Video */}
            <div className="flex justify-center w-full">
              <div className="w-full max-w-4xl rounded-lg border-2 border-secondary shadow-lg overflow-hidden bg-card">
                <div style={{ position: "relative", paddingBottom: "53.4%", height: 0, overflow: "hidden" }} className="rounded-lg">
                  <iframe
                    src="https://www.loom.com/embed/c19d7218c7824021a27be1fbded79c25"
                    frameBorder="0"
                    allowFullScreen
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-[4px] bg-secondary flex items-center justify-center">
              <HardHat className="h-3.5 w-3.5 text-secondary-foreground" />
            </div>
            <span className="text-sm font-semibold">Claro</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Claro. Plateforme de gestion des sinistres et travaux pour agences immobilières.
          </p>
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium">
            Réserver une démo
          </a>
        </div>
        <div className="mt-8 flex justify-center">
          <span className="text-xs text-muted-foreground/30 select-none">v0.1</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
