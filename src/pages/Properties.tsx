import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useProperties } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { useTickets } from "@/contexts/TicketContext";
import type { Property } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { TicketMiniList, TicketCountBadge } from "@/components/TicketMiniList";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Home, Upload, Check, ChevronsUpDown, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { ownerDisplayName } from "@/lib/displayName";
import { cn } from "@/lib/utils";

const emptyProperty: Omit<Property, "id"> = {
  address: "", city: "", postal_code: "", unit_number: "", floor: "", building_name: "", door_code: "", external_ref: "", owner_id: null,
};

const csvColumns = ["address", "city", "postal_code", "unit_number", "floor", "building_name", "door_code", "external_ref"];

export default function Properties() {
  const { settings } = useSettings();
  const { properties, addProperty, updateProperty, removeProperty, bulkInsert } = useProperties(settings.agency_id);
  const { owners } = useOwners(settings.agency_id);
  const { tickets } = useTickets();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Property, "id">>(emptyProperty);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);

  const selectedOwner = owners.find((o) => o.id === form.owner_id) ?? null;

  const ticketsForProperty = (p: Property) =>
    tickets.filter(t => t.bien.adresse.toLowerCase().includes(p.address.toLowerCase()));

  const filtered = properties.filter(p =>
    !search || [p.address, p.city, p.postal_code, p.unit_number, p.building_name].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setEditingId(null); setForm(emptyProperty); setShowForm(true); };
  const openEdit = (p: Property) => {
    setEditingId(p.id);
    setForm({
      address: p.address,
      city: p.city ?? "",
      postal_code: p.postal_code ?? "",
      unit_number: p.unit_number ?? "",
      floor: p.floor ?? "",
      building_name: p.building_name ?? "",
      door_code: p.door_code ?? "",
      external_ref: p.external_ref ?? "",
      owner_id: p.owner_id ?? null,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.address.trim()) return;
    if (editingId) {
      await updateProperty(editingId, form);
      toast.success("Bien modifié");
    } else {
      await addProperty(form);
      toast.success("Bien ajouté");
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await removeProperty(deleteConfirm);
    toast.success("Bien supprimé");
    setDeleteConfirm(null);
  };

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    const cleaned: Omit<Property, "id">[] = rows
      .filter(r => r.address?.trim())
      .map(r => ({
        address: r.address ?? "",
        city: r.city ?? "",
        postal_code: r.postal_code ?? "",
        unit_number: r.unit_number ?? "",
        floor: r.floor ?? "",
        building_name: r.building_name ?? "",
        door_code: r.door_code ?? "",
        external_ref: r.external_ref ?? "",
      }));
    if (cleaned.length === 0) throw new Error("Aucune ligne valide (colonne 'address' requise)");
    return bulkInsert(cleaned);
  };

  const set = <K extends keyof Omit<Property, "id">>(key: K, value: Property[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Biens</h1><p className="text-sm text-muted-foreground">Gérez le portefeuille de biens de l'agence</p></div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un bien..." className="pl-9" /></div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCsvOpen(true)}><Upload className="h-3.5 w-3.5" /> Importer CSV</Button>
        <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Home className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm">Aucun bien dans votre portefeuille.</p>
            <Button size="sm" variant="outline" onClick={openAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un bien</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adresse</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Bâtiment</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const pTickets = ticketsForProperty(p);
                const isExpanded = expandedId === p.id;
                return (
                  <>
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      <TableCell className="font-medium">{p.address}</TableCell>
                      <TableCell>{p.city}</TableCell>
                      <TableCell>{p.unit_number}</TableCell>
                      <TableCell>{p.building_name}</TableCell>
                      <TableCell className="text-xs">
                        {(() => {
                          const own = owners.find(o => o.id === p.owner_id);
                          return own ? ownerDisplayName(own) : <span className="italic text-muted-foreground">—</span>;
                        })()}
                      </TableCell>
                      <TableCell><TicketCountBadge count={pTickets.length} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5 mr-2" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(p.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${p.id}-tickets`}>
                        <TableCell colSpan={7} className="bg-muted/20 px-4 py-3">
                          <TicketMiniList tickets={pTickets} emptyLabel="Aucun ticket pour ce bien" />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier le bien" : "Ajouter un bien"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label>Adresse *</Label><Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="12 rue des Lilas" /></div>
            <div className="space-y-1"><Label>Ville</Label><Input value={form.city ?? ""} onChange={e => set("city", e.target.value)} placeholder="Lyon" /></div>
            <div className="space-y-1"><Label>Code postal</Label><Input value={form.postal_code ?? ""} onChange={e => set("postal_code", e.target.value)} placeholder="69003" /></div>
            <div className="space-y-1"><Label>Lot / Unité</Label><Input value={form.unit_number ?? ""} onChange={e => set("unit_number", e.target.value)} placeholder="Apt 2A" /></div>
            <div className="space-y-1"><Label>Étage</Label><Input value={form.floor ?? ""} onChange={e => set("floor", e.target.value)} placeholder="2" /></div>
            <div className="space-y-1"><Label>Bâtiment</Label><Input value={form.building_name ?? ""} onChange={e => set("building_name", e.target.value)} placeholder="Résidence Les Lilas" /></div>
            <div className="space-y-1"><Label>Code porte</Label><Input value={form.door_code ?? ""} onChange={e => set("door_code", e.target.value)} placeholder="A1234" /></div>
            <div className="space-y-1"><Label>Réf. externe</Label><Input value={form.external_ref ?? ""} onChange={e => set("external_ref", e.target.value)} placeholder="P-001" /></div>

            <div className="col-span-2 space-y-1">
              <Label>Propriétaire</Label>
              <Popover open={ownerPickerOpen} onOpenChange={setOwnerPickerOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full h-9 flex items-center gap-1.5 border rounded-md px-3 text-sm hover:bg-muted/50 transition-colors">
                    <span className={cn("flex-1 truncate text-left", selectedOwner ? "text-foreground" : "italic text-muted-foreground")}>
                      {selectedOwner ? ownerDisplayName(selectedOwner) : "Aucun propriétaire assigné"}
                    </span>
                    {selectedOwner && (
                      <XIcon
                        className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); set("owner_id", null); }}
                      />
                    )}
                    <ChevronsUpDown className="h-3 w-3 opacity-40 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-96" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un propriétaire…" />
                    <CommandList>
                      <CommandEmpty>Aucun propriétaire</CommandEmpty>
                      <CommandGroup>
                        {owners.map(o => {
                          const name = ownerDisplayName(o);
                          return (
                            <CommandItem key={o.id} value={name} onSelect={() => { set("owner_id", o.id); setOwnerPickerOpen(false); }}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", form.owner_id === o.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate flex-1">{name}</span>
                              {o.email && <span className="ml-2 text-[10px] text-muted-foreground truncate">{o.email}</span>}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.address.trim()}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} columns={csvColumns} entityName="bien" onImport={handleCsvImport} />
    </div>
  );
}
