import { Card, CardContent } from "@/components/ui/card";

export default function Assurance() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Assurance</h1><p className="text-sm text-muted-foreground">Module désactivé pour le moment</p></div>
      <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">La branche Sinistre/Assurance sera activée dans une prochaine version.</CardContent></Card>
    </div>
  );
}
