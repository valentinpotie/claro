import { Card, CardContent } from "@/components/ui/card";

export default function Assurance() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-xl font-bold font-display">Assurance</h1><p className="text-sm text-muted-foreground">Module désactivé pour le moment</p></div>
      <Card className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]"><CardContent className="py-12 text-center text-muted-foreground">La branche Sinistre/Assurance sera activée dans une prochaine version.</CardContent></Card>
    </div>
  );
}
