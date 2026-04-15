import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

const TEAM = [
  {
    initials: "YB",
    name: "Yasmine Boussaid",
    role: "Product & Stratégie",
    colorClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  {
    initials: "VP",
    name: "Valentin Potié",
    role: "Produit & Tech",
    colorClass: "bg-primary/15 text-primary",
  },
  {
    initials: "MH",
    name: "Miguel Humberto",
    role: "Stratégie & Recherche",
    colorClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
];

const STEPS = [
  {
    number: "1",
    title: "On a d'abord écouté",
    description:
      "On a mené plus de 20 entretiens avec des gestionnaires et directeurs d'agence en France pour comprendre les vrais problèmes du quotidien — avant d'écrire la moindre spec.",
  },
  {
    number: "2",
    title: "On a prototypé avec vous",
    description:
      "Chaque fonctionnalité a été testée avec de vraies agences avant d'être développée. Pas de fonctionnalité inventée dans le vide.",
  },
  {
    number: "3",
    title: "On construit en co-construction",
    description:
      "Vos retours pendant cette phase pilote façonnent directement le produit. Ce que vous nous remontez aujourd'hui, on l'intègre demain.",
  },
];

export default function AboutUs() {
  return (
    <div className="max-w-3xl mx-auto space-y-14 pb-16">

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-4">
        <h1 className="text-2xl font-bold font-display leading-snug">
          Claro, c'est une équipe avant d'être un outil.
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Trois étudiants en Product Management qui ont passé des mois sur le terrain pour comprendre votre
          quotidien avant d'écrire la moindre ligne de code.
        </p>
      </section>

      {/* ── 2. Notre démarche ────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-base font-semibold text-foreground">Notre démarche</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card key={step.number} className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{step.number}</span>
                </div>
                <p className="text-sm font-semibold leading-snug">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 3. Phase pilote ──────────────────────────────────────────────────── */}
      <section>
        <Card className="border border-primary/20 bg-primary/5 shadow-none">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Vous testez une version beta</h2>
              <div className="h-0.5 w-8 bg-primary rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Claro est en phase pilote. L'interface peut avoir des imperfections, certains flux peuvent manquer
              de polish, et des bugs peuvent apparaître — c'est normal à ce stade et nous le savons. Ce qui
              compte pour nous, c'est que chaque retour que vous nous faites arrive directement dans les mains
              de l'équipe et est pris en compte sans filtre.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vous avez un problème, une idée, une incohérence à signaler ? Écrivez-nous directement — on
              répond vite.
            </p>
            <a
              href="mailto:equipe@claroimmo.fr"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              equipe@claroimmo.fr
            </a>
          </CardContent>
        </Card>
      </section>

      {/* ── 4. L'équipe ──────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-base font-semibold">L'équipe</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TEAM.map((member) => (
            <Card key={member.name} className="border-0 shadow-sm">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div
                  className={`h-14 w-14 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${member.colorClass}`}
                >
                  {member.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{member.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Étudiants en Master Product Management — HETIC Paris, promotion 2026.
        </p>
      </section>

      {/* ── 5. Footer de page ────────────────────────────────────────────────── */}
      <section className="border-t border-border pt-8">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Merci de nous faire confiance à ce stade.{" "}
          On fait de notre mieux pour que Claro vous facilite vraiment la vie.
        </p>
      </section>
    </div>
  );
}
