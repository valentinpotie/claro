import { Quote } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Euro, Clock, CheckCircle2 } from "lucide-react";

interface Props {
  quotes: Quote[];
  onSelect: (quoteId: string) => void;
  disabled?: boolean;
}

export function QuoteComparison({ quotes, onSelect, disabled }: Props) {
  if (quotes.length === 0) return (
    <Card className="border-0 shadow-sm">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Aucun devis reçu pour le moment
      </CardContent>
    </Card>
  );

  const minPrice = Math.min(...quotes.map(q => q.montant));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Comparaison des devis ({quotes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className={`p-3 rounded-lg border transition-colors ${q.selected ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    {q.artisanNom}
                    {q.selected && <Badge className="bg-primary text-primary-foreground text-[10px]">Sélectionné</Badge>}
                    {q.montant === minPrice && !q.selected && <Badge variant="outline" className="text-[10px] border-success text-success">Moins cher</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                </div>
                {!q.selected && !disabled && (
                  <Button size="sm" variant="outline" onClick={() => onSelect(q.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Choisir
                  </Button>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{q.montant} €</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.delai}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
