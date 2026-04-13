import { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";
import { toast } from "sonner";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: string[];
  entityName: string;
  onImport: (rows: Record<string, string>[]) => Promise<number>;
}

export function CsvImportDialog({ open, onOpenChange, columns, entityName, onImport }: CsvImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const csv = columns.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modele_${entityName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.filter(row => Object.values(row).some(v => v?.trim()));
        if (rows.length === 0) {
          toast.error("Le fichier CSV est vide ou ne contient aucune donnée valide.");
          setImporting(false);
          return;
        }
        try {
          const count = await onImport(rows);
          toast.success(`${count} ${entityName}(s) importé(s) avec succès.`);
          onOpenChange(false);
        } catch (err) {
          toast.error(`Erreur lors de l'import : ${err instanceof Error ? err.message : "Erreur inconnue"}`);
        }
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      },
      error: (err) => {
        toast.error(`Erreur de lecture CSV : ${err.message}`);
        setImporting(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer des {entityName}s par CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Étape 1 — Téléchargez le modèle</p>
            <p className="text-xs text-muted-foreground">Téléchargez un fichier CSV vide avec les bonnes colonnes, remplissez-le, puis importez-le ci-dessous.</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" /> Télécharger le modèle CSV
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Étape 2 — Importez votre fichier</p>
            <p className="text-xs text-muted-foreground">Sélectionnez le fichier CSV rempli pour importer les données.</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" disabled={importing} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
