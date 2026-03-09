import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Phone, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { mockArtisans } from "@/data/mockData";

export default function Artisans() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          🔧 Objectif : Montrer le carnet d'artisans intelligent avec notation et disponibilité.
          <span className="text-muted-foreground font-normal"> → "Comment trouvez-vous vos artisans aujourd'hui ? Combien de temps passez-vous à chercher un artisan disponible ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Carnet d'artisans</h1>
        <p className="text-sm text-muted-foreground">{mockArtisans.length} artisans référencés · Recherche et attribution intelligente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockArtisans.map((artisan) => (
          <Card key={artisan.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">{artisan.nom}</p>
                  <p className="text-xs text-muted-foreground">{artisan.specialite}</p>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="font-medium">{artisan.note}</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {artisan.ville}</div>
                <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {artisan.telephone}</div>
                <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> Délai moyen : {artisan.delaiMoyen}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> {artisan.interventions} interventions</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1 bg-primary text-xs">Contacter</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs">Demander devis</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
