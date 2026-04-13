import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useTenants } from "@/hooks/useTenants";
import type { Tenant } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Users, Upload } from "lucide-react";
import { toast } from "sonner";

const emptyTenant: Omit<Tenant, "id"> = {
  first_name: "", last_name: "", email: "", phone: "", lease_start: "", lease_end: "", is_active: true, external_ref: "",
};

const csvColumns = ["first_name", "last_name", "email", "phone", "lease_start", "lease_end", "is_active", "external_ref"];

export default function Tenants() {
  const { settings } = useSettings();
  const { tenants, addTenant, updateTenant, removeTenant, bulkInsert } = useTenants(settings.agency_id);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Tenant, "id">>(emptyTenant);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = tenants.filter(t =>
    !search || [t.first_name, t.last_name, t.email, t.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setEditingId(null); setForm(emptyTenant); setShowForm(true); };
  const openEdit = (t: Tenant) => {
    setEditingId(t.id);
    setForm({ first_name: t.first_name ?? "", last_name: t.last_name, email: t.email ?? "", phone: t.phone ?? "", lease_start: t.lease_start ?? "", lease_end: t.lease_end ?? "", is_active: t.is_active ?? true, external_ref: t.external_ref ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.last_name.trim()) return;
    if (editingId) {
      await updateTenant(editingId, form);
      toast.success("Locataire modifié");
    } else {
      await addTenant(form);
      toast.success("Locataire ajouté");
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await removeTenant(deleteConfirm);
    toast.success("Locataire supprimé");
    setDeleteConfirm(null);
  };

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    const cleaned: Omit<Tenant, "id">[] = rows
      .filter(r => r.last_name?.trim())
      .map(r => ({
        first_name: r.first_name ?? "",
        last_name: r.last_name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        lease_start: r.lease_start ?? "",
        lease_end: r.lease_end ?? "",
        is_active: r.is_active?.toLowerCase() !== "false",
        external_ref: r.external_ref ?? "",
      }));
    if (cleaned.length === 0) throw new Error("Aucune ligne valide (colonne 'last_name' requise)");
    return bulkInsert(cleaned);
  };

  const set = (key: keyof Omit<Tenant, "id">, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Locataires</h1><p className="text-sm text-muted-foreground">Gérez les locataires de votre portefeuille</p></div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un locataire..." className="pl-9" /></div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCsvOpen(true)}><Upload className="h-3.5 w-3.5" /> Importer CSV</Button>
        <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm">Aucun locataire enregistré.</p>
            <Button size="sm" variant="outline" onClick={openAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un locataire</Button>
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
                <TableHead>Bail début</TableHead>
                <TableHead>Bail fin</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{[t.first_name, t.last_name].filter(Boolean).join(" ")}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>{t.phone}</TableCell>
                  <TableCell>{t.lease_start}</TableCell>
                  <TableCell>{t.lease_end ?? "—"}</TableCell>
                  <TableCell><Badge variant={t.is_active !== false ? "default" : "secondary"} className="text-[10px]">{t.is_active !== false ? "Actif" : "Inactif"}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5 mr-2" /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(t.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>{editingId ? "Modifier le locataire" : "Ajouter un locataire"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Prénom</Label><Input value={form.first_name ?? ""} onChange={e => set("first_name", e.target.value)} placeholder="Julie" /></div>
            <div className="space-y-1"><Label>Nom *</Label><Input value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Petit" /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="julie@email.fr" /></div>
            <div className="space-y-1"><Label>Téléphone</Label><Input value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} placeholder="06 12 34 56 78" /></div>
            <div className="space-y-1"><Label>Début bail</Label><Input type="date" value={form.lease_start ?? ""} onChange={e => set("lease_start", e.target.value)} /></div>
            <div className="space-y-1"><Label>Fin bail</Label><Input type="date" value={form.lease_end ?? ""} onChange={e => set("lease_end", e.target.value)} /></div>
            <div className="space-y-1"><Label>Réf. externe</Label><Input value={form.external_ref ?? ""} onChange={e => set("external_ref", e.target.value)} placeholder="T-001" /></div>
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
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer ce locataire ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} columns={csvColumns} entityName="locataire" onImport={handleCsvImport} />
    </div>
  );
}
