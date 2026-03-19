import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Target, MessageSquare, Euro, Users, Lightbulb } from "lucide-react";

export default function Guide() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Guide de démo & entretien discovery</h1>
        <p className="text-sm text-muted-foreground">Scénario complet, questions d'entretien et approche pricing</p>
      </div>

      {/* Scénario de démo */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Scénario de démo complet (15 min)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-4">
              <p className="font-semibold mb-1">1. Accroche (2 min) — Dashboard</p>
              <p className="text-muted-foreground">"Imaginez que c'est lundi matin. Vous ouvrez SinistreFlow et vous voyez immédiatement vos 6 dossiers ouverts, dont 2 urgents. Pas besoin de chercher dans vos emails ou votre tableur."</p>
              <p className="mt-2 font-medium text-primary">→ Observer la réaction : hochement de tête, soupir de reconnaissance ?</p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="font-semibold mb-1">2. Signalement (3 min) — Formulaire</p>
              <p className="text-muted-foreground">"Un locataire vous appelle : fuite sous l'évier. En 30 secondes, vous créez le dossier. L'outil diagnostique automatiquement : catégorie plomberie, priorité haute (risque dégât des eaux), et trouve 3 artisans disponibles."</p>
              <p className="mt-2 font-medium text-primary">→ Mesurer l'intérêt pour l'automatisation du diagnostic</p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="font-semibold mb-1">3. Parcours complet (5 min) — Détail ticket</p>
              <p className="text-muted-foreground">"Prenons un dossier en cours : la panne de chaudière. L'artisan est trouvé, le devis envoyé au propriétaire, le RDV fixé à lundi. Tout est suivi dans un seul endroit."</p>
              <p className="mt-2 font-medium text-primary">→ Identifier les étapes où ils perdent le plus de temps</p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="font-semibold mb-1">4. Points de douleur (3 min) — Accord proprio. + Artisans</p>
              <p className="text-muted-foreground">"L'accord propriétaire : en un clic, vous envoyez le devis. Relance automatique à 48h. Pour les artisans : votre carnet avec notes, disponibilité et historique."</p>
              <p className="mt-2 font-medium text-primary">→ Confirmer que l'accord proprio est bien le pain point #1</p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="font-semibold mb-1">5. ROI (2 min) — Facturation + Assurance</p>
              <p className="text-muted-foreground">"Facturation centralisée, suivi des paiements. Pour les cas assurance : toutes les pièces au même endroit, suivi de l'expertise, relances automatiques."</p>
              <p className="mt-2 font-medium text-primary">→ Quantifier le temps gagné en euros</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guide d'entretien */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Guide d'entretien discovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Fréquence & volume</h3>
            <ul className="space-y-1 text-muted-foreground list-disc ml-5">
              <li>"Combien de sinistres/demandes de travaux gérez-vous par mois ?"</li>
              <li>"Combien de lots gérez-vous au total ?"</li>
              <li>"Quelle est la répartition entre urgences et demandes courantes ?"</li>
              <li>"Combien de personnes dans votre équipe gèrent les sinistres ?"</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Processus actuel & pain points</h3>
            <ul className="space-y-1 text-muted-foreground list-disc ml-5">
              <li>"Pouvez-vous me décrire ce qui se passe quand un locataire vous signale un problème ?"</li>
              <li>"Quels outils utilisez-vous aujourd'hui ? (email, Excel, logiciel métier ?)"</li>
              <li>"Quelle est l'étape qui vous prend le plus de temps ?"</li>
              <li>"À quelle fréquence perdez-vous le fil d'un dossier ?"</li>
              <li>"Comment gérez-vous la coordination avec les artisans ?"</li>
              <li>"Quel est votre plus gros problème avec les propriétaires ?"</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-accent" /> Valeur perçue & automatisation</h3>
            <ul className="space-y-1 text-muted-foreground list-disc ml-5">
              <li>"Si cet outil existait, par quelle fonctionnalité commenceriez-vous ?"</li>
              <li>"Le diagnostic automatique : est-ce que ça vous parle ? Avez-vous confiance ?"</li>
              <li>"Les relances automatiques aux propriétaires : gain de temps ou risque ?"</li>
              <li>"Qu'est-ce qui vous ferait gagner le plus de temps dans votre quotidien ?"</li>
              <li>"Seriez-vous prêt à changer d'outil pour ça ?"</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Adoption & objections</h3>
            <ul className="space-y-1 text-muted-foreground list-disc ml-5">
              <li>"Qu'est-ce qui pourrait freiner l'adoption dans votre agence ?"</li>
              <li>"Avez-vous déjà essayé d'autres solutions ? Pourquoi ça n'a pas marché ?"</li>
              <li>"Qui décide des outils dans votre agence ?"</li>
              <li>"Vos artisans utiliseraient-ils aussi l'outil ?"</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Approche pricing */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Euro className="h-5 w-5 text-primary" /> Approche pricing (sans biaiser)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <p className="font-semibold mb-2">Méthode Van Westendorp (recommandée)</p>
            <p className="text-muted-foreground mb-3">Poser ces 4 questions dans l'ordre, APRÈS la démo, sans donner de prix :</p>
            <ol className="list-decimal ml-5 space-y-2 text-muted-foreground">
              <li>"À quel prix cet outil vous semblerait <span className="font-medium text-foreground">trop cher</span>, au point de ne pas l'acheter ?"</li>
              <li>"À quel prix cet outil vous semblerait <span className="font-medium text-foreground">cher mais acceptable</span>, en considérant les gains ?"</li>
              <li>"À quel prix cet outil vous semblerait être une <span className="font-medium text-foreground">bonne affaire</span> ?"</li>
              <li>"À quel prix cet outil vous semblerait <span className="font-medium text-foreground">trop bon marché</span> pour être crédible ?"</li>
            </ol>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="font-semibold mb-2">Questions complémentaires ROI</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li>"Combien d'heures par semaine consacrez-vous à la gestion des sinistres ?"</li>
              <li>"Quel est le coût horaire moyen d'un gestionnaire dans votre agence ?"</li>
              <li>"Avez-vous déjà perdu un locataire ou un propriétaire à cause d'un sinistre mal géré ?"</li>
              <li>"Si l'outil vous faisait gagner X heures/semaine, quel budget seriez-vous prêt à y consacrer ?"</li>
            </ul>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="font-semibold mb-2">⚠️ Pièges à éviter</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li>Ne JAMAIS donner un prix avant de poser les questions</li>
              <li>Ne pas demander "combien paieriez-vous ?" (trop direct, réponse biaisée)</li>
              <li>Laisser le silence après chaque question (ne pas combler)</li>
              <li>Noter le langage corporel et les hésitations</li>
              <li>Distinguer "intéressant" (politesse) de "je signerais demain" (engagement)</li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="font-semibold mb-2">Signaux d'achat à observer</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li>🟢 "On peut commencer quand ?" → Fort signal d'achat</li>
              <li>🟢 "Est-ce que ça s'intègre avec notre logiciel ?" → Projection concrète</li>
              <li>🟡 "C'est intéressant" → Politesse, creuser plus</li>
              <li>🟡 "Il faudrait que j'en parle à mon directeur" → Identifier le décideur</li>
              <li>🔴 "On a déjà essayé ce genre d'outil" → Objection d'adoption, explorer</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
