import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ExternalLink, Send, User, Home, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useTenants } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { categoryLabels, priorityLabels, TicketCategory, TicketPriority } from "@/data/types";
import { cn } from "@/lib/utils";
import { ownerDisplayName } from "@/lib/displayName";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewTicketModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { createTicket } = useTickets();
  const { settings } = useSettings();
  const { tenants } = useTenants(settings.agency_id);
  const { properties } = useProperties(settings.agency_id);
  const { owners } = useOwners(settings.agency_id);

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState<TicketCategory>("autre");
  const [priorite, setPriorite] = useState<TicketPriority>("normale");
  const [urgence, setUrgence] = useState(false);
  const [openPopover, setOpenPopover] = useState<"tenant" | "property" | "owner" | null>(null);

  const tenant = useMemo(() => tenants.find(t => t.id === tenantId) ?? null, [tenants, tenantId]);
  const property = useMemo(() => properties.find(p => p.id === propertyId) ?? null, [properties, propertyId]);
  const owner = useMemo(() => owners.find(o => o.id === ownerId) ?? null, [owners, ownerId]);

  const canSubmit = !!titre.trim() && !!tenantId && !!propertyId && !!ownerId;

  const reset = () => {
    setTitre(""); setDescription(""); setCategorie("autre"); setPriorite("normale");
    setUrgence(false); setTenantId(null); setPropertyId(null); setOwnerId(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!canSubmit || !tenant || !property || !owner) return;
    const tenantName = [tenant.first_name, tenant.last_name].filter(Boolean).join(" ").trim();
    const ownerName = ownerDisplayName(owner);
    const propertyAddress = [property.address, property.city].filter(Boolean).join(", ");

    createTicket({
      titre: titre.trim(),
      description: description.trim(),
      categorie,
      priorite: urgence ? "urgente" : priorite,
      urgence,
      locataireNom: tenantName,
      locataireTel: tenant.phone ?? "",
      locataireEmail: tenant.email ?? "",
      adresse: propertyAddress,
      lot: property.unit_number ?? "",
      proprietaire: ownerName,
      telephoneProprio: owner.phone ?? "",
      emailProprio: owner.email ?? "",
      tenant_id: tenant.id,
      property_id: property.id,
      owner_id: owner.id,
    });

    reset();
    onClose();
    navigate("/tickets");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Nouveau ticket
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-0.5">
            Créez un ticket à partir d'un appel téléphonique ou d'une visite — le workflow est identique à un ticket arrivé par email.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Titre *</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Fuite sous évier cuisine" className="text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-sm resize-none" placeholder="Détail du problème reporté par le locataire" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Catégorie *</Label>
              <Select value={categorie} onValueChange={(v) => setCategorie(v as TicketCategory)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priorité</Label>
              <Select value={priorite} onValueChange={(v) => setPriorite(v as TicketPriority)} disabled={urgence}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Urgence</Label>
              <div className="flex items-center h-9 border rounded-[4px] px-3 justify-between">
                <span className="text-xs text-muted-foreground">Marquer urgent</span>
                <Switch checked={urgence} onCheckedChange={setUrgence} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SelectorButton
              icon={User}
              label="Locataire *"
              selected={tenant ? `${tenant.first_name ?? ""} ${tenant.last_name}`.trim() : null}
              open={openPopover === "tenant"}
              onOpenChange={(o) => setOpenPopover(o ? "tenant" : null)}
              placeholder="Rechercher un locataire…"
              emptyLabel="Aucun locataire"
              items={tenants.map(t => ({
                id: t.id,
                label: `${t.first_name ?? ""} ${t.last_name}`.trim(),
                sublabel: t.phone ?? t.email ?? undefined,
              }))}
              onSelect={(id) => { setTenantId(id); setOpenPopover(null); }}
              manageHref="/tenants"
              manageLabel="Gérer les locataires"
              navigate={navigate}
            />
            <SelectorButton
              icon={Home}
              label="Bien *"
              selected={property ? `${property.address}${property.unit_number ? ` · ${property.unit_number}` : ""}` : null}
              open={openPopover === "property"}
              onOpenChange={(o) => setOpenPopover(o ? "property" : null)}
              placeholder="Rechercher un bien…"
              emptyLabel="Aucun bien"
              items={properties.map(p => ({
                id: p.id,
                label: `${p.address}${p.unit_number ? ` · ${p.unit_number}` : ""}`,
                sublabel: p.city ?? undefined,
              }))}
              onSelect={(id) => { setPropertyId(id); setOpenPopover(null); }}
              manageHref="/properties"
              manageLabel="Gérer les biens"
              navigate={navigate}
            />
            <SelectorButton
              icon={UserCircle2}
              label="Propriétaire *"
              selected={owner ? ownerDisplayName(owner) : null}
              open={openPopover === "owner"}
              onOpenChange={(o) => setOpenPopover(o ? "owner" : null)}
              placeholder="Rechercher un propriétaire…"
              emptyLabel="Aucun propriétaire"
              items={owners.map(o => ({
                id: o.id,
                label: ownerDisplayName(o),
                sublabel: o.email ?? o.phone ?? undefined,
              }))}
              onSelect={(id) => { setOwnerId(id); setOpenPopover(null); }}
              manageHref="/owners"
              manageLabel="Gérer les propriétaires"
              navigate={navigate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Créer le ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SelectorButtonProps {
  icon: typeof User;
  label: string;
  selected: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  emptyLabel: string;
  items: Array<{ id: string; label: string; sublabel?: string }>;
  onSelect: (id: string) => void;
  manageHref: string;
  manageLabel: string;
  navigate: (href: string) => void;
}

function SelectorButton({ icon: Icon, label, selected, open, onOpenChange, placeholder, emptyLabel, items, onSelect, manageHref, manageLabel, navigate }: SelectorButtonProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button className="w-full h-9 flex items-center gap-1.5 border rounded-[4px] px-3 text-xs hover:bg-muted/50 transition-colors">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={cn("flex-1 truncate text-left", selected ? "text-foreground" : "italic text-muted-foreground")}>
              {selected ?? "Sélectionner"}
            </span>
            <ChevronsUpDown className="h-3 w-3 opacity-40 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-72" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {items.map(item => (
                  <CommandItem key={item.id} value={item.label} onSelect={() => onSelect(item.id)}>
                    <Check className={cn("mr-2 h-3.5 w-3.5", selected === item.label ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.sublabel && <span className="ml-auto text-[10px] text-muted-foreground truncate">{item.sublabel}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1.5">
              <button
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors"
                onClick={() => navigate(manageHref)}
              >
                <ExternalLink className="h-3 w-3" /> {manageLabel}
              </button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
