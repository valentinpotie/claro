import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useOwners } from "@/hooks/useOwners";
import type { Owner } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, UserCheck, Upload } from "lucide-react";
import { toast } from "sonner";

const emptyOwner: Omit<Owner, "id"> = {
  first_name: "", last_name: "", email: "", phone: "", validation_threshold: 500, prefers_phone: false, external_ref: "",
};

const csvColumns = ["first_name", "last_name", "email", "phone", "validation_threshold", "prefers_phone", "external_ref"];

export default function Owners() {
  const { settings } = useSettings();
  const { owners, addOwner, updateOwner, removeOwner, bulkInsert } = useOwners(settings.agency_id);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Owner, "id">>(emptyOwner);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = owners.filter(o =>
    !search || [o.first_name, o.last_name, o.email, o.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setEditingId(null); setForm(emptyOwner); setShowForm(true); };
  const openEdit = (o: Owner) => {
    setEditingId(o.id);
    setForm({ first_name: o.first_name ?? "", last_name: o.last_name, email: o.email ?? "", phone: o.phone ?? "", validation_threshold: o.validation_threshold ?? 500, prefers_phone: o.prefers_phone ?? false, external_ref: o.external_ref ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.last_name.trim()) return;
    if (editingId) {
      await updateOwner(editingId, form);
      toast.success("Propriétaire modifié");
    } else {
      await addOwner(form);
      toast.success("Propriétaire ajouté");
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await removeOwner(deleteConfirm);
    toast.success("Propriétaire supprimé");
    setDeleteConfirm(null);
  };

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    const cleaned: Omit<Owner, "id">[] = rows
      .filter(r => r.last_name?.trim())
      .map(r => ({
        first_name: r.first_name ?? "",
        last_name: r.last_name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        validation_threshold: r.validation_threshold ? parseInt(r.validation_threshold, 10) || 500 : 500,
        prefers_phone: r.prefers_phone?.toLowerCase() === "true",
        external_ref: r.external_ref ?? "",
      }));
    if (cleaned.length === 0) throw new Error("Aucune ligne valide (colonne 'last_name' requise)");
    return bulkInsert(cleaned);
  };

  const set = (key: keyof Omit<Owner, "id">, value: string | number | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Propriétaires</h1><p className="text-sm text-muted-foreground">Gérez les propriétaires de votre portefeuille</p></div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un propriétaire..." className="pl-9" /></div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCsvOpen(true)}><Upload className="h-3.5 w-3.5" /> Importer CSV</Button>
        <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <UserCheck className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm">Aucun propriétaire enregistré.</p>
            <Button size="sm" variant="outline" onClick={openAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un propriétaire</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Seuil validation</TableHead>
                <TableHead>Préfère tél.</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{[o.first_name, o.last_name].filter(Boolean).join(" ")}</TableCell>
                  <TableCell>{o.email}</TableCell>
                  <TableCell>{o.phone}</TableCell>
                  <TableCell>{o.validation_threshold ?? 500} €</TableCell>
                  <TableCell><Badge variant={o.prefers_phone ? "default" : "secondary"} className="text-[10px]">{o.prefers_phone ? "Oui" : "Non"}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5 mr-2" /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(o.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier le propriétaire" : "Ajouter un propriétaire"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Prénom</Label><Input value={form.first_name ?? ""} onChange={e => set("first_name", e.target.value)} placeholder="Bernard" /></div>
            <div className="space-y-1"><Label>Nom *</Label><Input value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Dupont" /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="bernard@email.fr" /></div>
            <div className="space-y-1"><Label>Téléphone</Label><Input value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} placeholder="06 11 22 33 44" /></div>
            <div className="space-y-1"><Label>Seuil de validation (€)</Label><Input type="number" value={form.validation_threshold ?? 500} onChange={e => set("validation_threshold", parseInt(e.target.value, 10) || 0)} /></div>
            <div className="space-y-1"><Label>Réf. externe</Label><Input value={form.external_ref ?? ""} onChange={e => set("external_ref", e.target.value)} placeholder="O-001" /></div>
            <div className="col-span-2 flex items-center justify-between rounded-md border border-input px-3 py-2.5">
              <div><p className="text-sm font-medium">Préfère le téléphone</p><p className="text-xs text-muted-foreground">Contacter ce propriétaire par téléphone plutôt que par email.</p></div>
              <Switch checked={form.prefers_phone ?? false} onCheckedChange={v => set("prefers_phone", v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.last_name.trim()}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer ce propriétaire ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} columns={csvColumns} entityName="propriétaire" onImport={handleCsvImport} />
    </div>
  );
}
