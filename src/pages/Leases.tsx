import { useMemo, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLeases } from "@/hooks/useLeases";
import { useTenants } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import type { Lease, LeaseType, Tenant } from "@/data/types";
import { leaseTypeLabels, isLeaseCurrentlyActive } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, FileText, Star, X as XIcon, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { tenantDisplayName, resolveLeasePrimaryTenant } from "@/lib/displayName";
import { cn } from "@/lib/utils";

type FormState = {
  property_id: string;
  lease_type: LeaseType;
  external_ref: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  is_active: boolean;
  notes: string;
  tenants: Array<{ id: string; is_primary: boolean }>;
};

const emptyForm: FormState = {
  property_id: "", lease_type: "residential", external_ref: "", start_date: "",
  end_date: "", rent_amount: "", is_active: true, notes: "",
  tenants: [],
};

export default function Leases() {
  const { settings } = useSettings();
  const { leases, createLease, updateLease, deleteLease } = useLeases(settings.agency_id);
  const { tenants } = useTenants(settings.agency_id);
  const { properties } = useProperties(settings.agency_id);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | LeaseType>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  const filtered = useMemo(() => leases.filter((l) => {
    const active = isLeaseCurrentlyActive(l);
    if (statusFilter === "active" && !active) return false;
    if (statusFilter === "inactive" && active) return false;
    if (typeFilter !== "all" && l.lease_type !== typeFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const primary = resolveLeasePrimaryTenant(l)?.tenant;
    const tenantName = primary ? tenantDisplayName(primary).toLowerCase() : "";
    const addr = l.property?.address?.toLowerCase() ?? "";
    const ref = l.external_ref?.toLowerCase() ?? "";
    return tenantName.includes(s) || addr.includes(s) || ref.includes(s);
  }), [leases, search, statusFilter, typeFilter]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (l: Lease) => {
    setEditingId(l.id);
    setForm({
      property_id: l.property_id,
      lease_type: l.lease_type,
      external_ref: l.external_ref ?? "",
      start_date: l.start_date,
      end_date: l.end_date ?? "",
      rent_amount: l.rent_amount != null ? String(l.rent_amount) : "",
      is_active: l.is_active,
      notes: l.notes ?? "",
      tenants: (l.tenants ?? []).map(lt => ({ id: lt.tenant_id, is_primary: lt.is_primary })),
    });
    setShowForm(true);
  };

  const selectedProperty = properties.find(p => p.id === form.property_id) ?? null;

  const activeOnSameProperty = useMemo(() =>
    leases.find(l => l.property_id === form.property_id && l.is_active && l.id !== editingId),
  [leases, form.property_id, editingId]);

  const canSubmit = !!form.property_id && !!form.start_date.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (editingId) {
        await updateLease(editingId, {
          property_id: form.property_id,
          lease_type: form.lease_type,
          external_ref: form.external_ref.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date.trim() || null,
          rent_amount: form.rent_amount.trim() ? parseFloat(form.rent_amount) : null,
          notes: form.notes.trim() || null,
          is_active: form.is_active,
        });
        toast.success("Bail modifié");
      } else {
        await createLease({
          property_id: form.property_id,
          lease_type: form.lease_type,
          external_ref: form.external_ref.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date.trim() || null,
          rent_amount: form.rent_amount.trim() ? parseFloat(form.rent_amount) : null,
          notes: form.notes.trim() || null,
          is_active: form.is_active,
          tenant_ids: form.tenants,
        });
        toast.success("Bail créé");
      }
      setShowForm(false);
      setEditingId(null);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === "23505") {
        toast.error("Un bail actif existe déjà sur ce bien", {
          description: "Clôturez-le d'abord (passez is_active à false) avant d'en créer un nouveau.",
        });
      } else {
        toast.error("Échec de l'enregistrement", { description: err.message ?? "Erreur inconnue" });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteLease(deleteConfirm);
      toast.success("Bail supprimé");
    } catch (e) {
      toast.error("Impossible de supprimer ce bail", { description: e instanceof Error ? e.message : undefined });
    }
    setDeleteConfirm(null);
  };

  const addTenantRow = (tenantId: string) => {
    if (form.tenants.some(t => t.id === tenantId)) return;
    const isFirst = form.tenants.length === 0;
    setForm(prev => ({ ...prev, tenants: [...prev.tenants, { id: tenantId, is_primary: isFirst }] }));
    setTenantPickerOpen(false);
  };
  const removeTenantRow = (tenantId: string) => {
    setForm(prev => {
      const next = prev.tenants.filter(t => t.id !== tenantId);
      // Re-promote the first remaining as primary if we just removed the primary.
      if (next.length > 0 && !next.some(t => t.is_primary)) next[0].is_primary = true;
      return { ...prev, tenants: next };
    });
  };
  const setPrimaryRow = (tenantId: string) => {
    setForm(prev => ({ ...prev, tenants: prev.tenants.map(t => ({ ...t, is_primary: t.id === tenantId })) }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Baux</h1>
        <p className="text-sm text-muted-foreground">Un bail actif par bien. Les baux inactifs restent en historique.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Référence, adresse, locataire…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
            <SelectItem value="all">Tous</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(leaseTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Nouveau bail</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm">Aucun bail {statusFilter === "active" ? "actif" : statusFilter === "inactive" ? "inactif" : ""} enregistré.</p>
            <Button size="sm" variant="outline" onClick={openAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Créer un bail</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Locataire(s)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => {
                const primary = resolveLeasePrimaryTenant(l);
                const extras = (l.tenants?.length ?? 0) - 1;
                const active = isLeaseCurrentlyActive(l);
                const prop = l.property;
                const propLabel = prop ? `${prop.address}${prop.unit_number ? ` · ${prop.unit_number}` : ""}` : "—";
                const endLabel = l.end_date ? new Date(l.end_date).toLocaleDateString("fr-FR") : "indéterminée";
                return (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEdit(l)}>
                    <TableCell className="font-mono text-xs">{l.external_ref ?? "—"}</TableCell>
                    <TableCell className="truncate max-w-[260px]">{propLabel}</TableCell>
                    <TableCell>
                      {primary?.tenant ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span>{tenantDisplayName(primary.tenant)}</span>
                          {extras > 0 && <Badge variant="secondary" className="text-[10px]">+{extras}</Badge>}
                        </span>
                      ) : <span className="text-muted-foreground italic">Aucun</span>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{leaseTypeLabels[l.lease_type]}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.start_date).toLocaleDateString("fr-FR")} → {endLabel}
                    </TableCell>
                    <TableCell>
                      <Badge className={active ? "bg-success/15 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                        {active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5 mr-2" /> Modifier</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(l.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Modifier le bail" : "Nouveau bail"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Bien *</Label>
              <Popover open={propertyPickerOpen} onOpenChange={setPropertyPickerOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full h-9 flex items-center gap-1.5 border rounded-[4px] px-3 text-xs hover:bg-muted/50 transition-colors">
                    <span className={cn("flex-1 truncate text-left", selectedProperty ? "text-foreground" : "italic text-muted-foreground")}>
                      {selectedProperty ? `${selectedProperty.address}${selectedProperty.unit_number ? ` · ${selectedProperty.unit_number}` : ""}` : "Sélectionner"}
                    </span>
                    <ChevronsUpDown className="h-3 w-3 opacity-40 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-96" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un bien…" />
                    <CommandList>
                      <CommandEmpty>Aucun bien</CommandEmpty>
                      <CommandGroup>
                        {properties.map((p) => {
                          const label = `${p.address}${p.unit_number ? ` · ${p.unit_number}` : ""}`;
                          return (
                            <CommandItem key={p.id} value={label} onSelect={() => { setForm(prev => ({ ...prev, property_id: p.id })); setPropertyPickerOpen(false); }}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", form.property_id === p.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{label}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.is_active && activeOnSameProperty && (
                <p className="text-[11px] text-destructive">
                  ⚠ Un bail actif existe déjà sur ce bien ({activeOnSameProperty.external_ref ?? "sans référence"}). L'enregistrement échouera tant qu'il n'est pas clôturé.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.lease_type} onValueChange={(v) => setForm(prev => ({ ...prev, lease_type: v as LeaseType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(leaseTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Référence externe</Label>
                <Input value={form.external_ref} onChange={e => setForm(prev => ({ ...prev, external_ref: e.target.value }))} placeholder="BAIL000363" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Début *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fin</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))} placeholder="Indéterminée" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Loyer (€)</Label>
                <Input type="number" step="0.01" value={form.rent_amount} onChange={e => setForm(prev => ({ ...prev, rent_amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Locataires du bail</Label>
              <div className="space-y-1">
                {form.tenants.length === 0 && <p className="text-[11px] text-muted-foreground italic">Aucun locataire. Ajoutez-en au moins un pour que le bail soit utile.</p>}
                {form.tenants.map((row) => {
                  const t = tenants.find(x => x.id === row.id);
                  return (
                    <div key={row.id} className="flex items-center gap-2 rounded-[4px] border px-3 py-1.5">
                      <Button size="icon" variant="ghost" className="h-6 w-6" title={row.is_primary ? "Principal" : "Désigner comme principal"} onClick={() => setPrimaryRow(row.id)}>
                        <Star className={cn("h-3.5 w-3.5", row.is_primary ? "fill-primary text-primary" : "text-muted-foreground")} />
                      </Button>
                      <span className="flex-1 truncate text-xs">{t ? tenantDisplayName(t) : row.id}</span>
                      {row.is_primary && <Badge variant="secondary" className="text-[10px]">Principal</Badge>}
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeTenantRow(row.id)}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Popover open={tenantPickerOpen} onOpenChange={setTenantPickerOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                    <Plus className="h-3 w-3" /> Ajouter un locataire
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-72" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un locataire…" />
                    <CommandList>
                      <CommandEmpty>Aucun locataire</CommandEmpty>
                      <CommandGroup>
                        {tenants.filter(t => !form.tenants.some(x => x.id === t.id)).map((t: Tenant) => {
                          const label = tenantDisplayName(t);
                          return (
                            <CommandItem key={t.id} value={label} onSelect={() => addTenantRow(t.id)}>
                              <span className="truncate flex-1">{label}</span>
                              {t.email && <span className="ml-2 text-[10px] text-muted-foreground truncate">{t.email}</span>}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observations internes, clauses particulières…" />
            </div>

            <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Bail actif</p>
                <p className="text-xs text-muted-foreground">Un seul bail actif par bien. Désactivez-le lorsque le bail arrive à échéance.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(prev => ({ ...prev, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>{editingId ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Supprimer ce bail ? Les tickets liés perdront leur référence de bail (lien historique conservé via la référence snapshot).</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
