import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { Artisan, Ticket, categoryLabels, statusLabels, statusColors } from "@/data/types";
import { ArtisanContactModal } from "@/components/ArtisanContactModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, Send, Wrench, Search, Plus, Trash2, Building2, Briefcase } from "lucide-react";
import { ArtisanFormFields, artisanSpecialtyLabels } from "@/components/ArtisanFormFields";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Artisans() {
  const { tickets, artisans, addArtisan, updateArtisan, removeArtisan, sendArtisanContact } = useTickets();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newArtisan, setNewArtisan] = useState<Omit<Artisan, "id">>({
    nom: "", specialites: [], ville: "", address: "", telephone: "", email: "",
    note: 5, interventions: 0, delaiMoyen: "48h",
  });
  const [editArtisan, setEditArtisan] = useState<Omit<Artisan, "id"> | null>(null);
  const [contactPending, setContactPending] = useState<{ artisan: Artisan; ticket: Ticket } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const ticketsArtisan = tickets.filter(t => t.status === "contact_artisan" || t.status === "reception_devis");
  const filteredArtisans = artisans.filter(a => !search || a.nom.toLowerCase().includes(search.toLowerCase()) || a.specialites.some(s => (artisanSpecialtyLabels[s] ?? s).toLowerCase().includes(search.toLowerCase())));

  const handleAddArtisan = () => {
    if (!newArtisan.nom.trim()) return;
    addArtisan(newArtisan);
    setNewArtisan({ nom: "", specialites: [], ville: "", address: "", telephone: "", email: "", note: 5, interventions: 0, delaiMoyen: "48h" });
    setShowForm(false);
  };

  const openEdit = (artisan: Artisan) => {
    setEditingId(artisan.id);
    setEditArtisan({
      nom: artisan.nom,
      specialites: artisan.specialites ?? [],
      ville: artisan.ville,
      address: artisan.address ?? "",
      note: artisan.note,
      interventions: artisan.interventions,
      delaiMoyen: artisan.delaiMoyen,
      telephone: artisan.telephone,
      email: artisan.email,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditArtisan(null);
  };

  const saveEdit = () => {
    if (!editingId || !editArtisan || !editArtisan.nom.trim()) return;
    updateArtisan(editingId, editArtisan);
    cancelEdit();
  };

  return (
    <>
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Artisans</h1><p className="text-sm text-muted-foreground">Gérez votre annuaire d'artisans et les tickets en cours</p></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Artisans</p><p className="text-2xl font-bold">{artisans.length}</p></div><Building2 className="h-8 w-8 text-foreground/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Tickets à pourvoir</p><p className="text-2xl font-bold">{ticketsArtisan.length}</p></div><Briefcase className="h-8 w-8 text-foreground/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Artisans visibles</p><p className="text-2xl font-bold">{filteredArtisans.length}</p></div><Search className="h-8 w-8 text-foreground/20" /></div></CardContent></Card>
      </div>
      <Tabs defaultValue="annuaire">
        <TabsList><TabsTrigger value="annuaire">Annuaire ({artisans.length})</TabsTrigger><TabsTrigger value="tickets">Tickets ({ticketsArtisan.length})</TabsTrigger></TabsList>

        <TabsContent value="annuaire" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un artisan..." className="pl-9" /></div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
          </div>

          {/* Add form */}
          {showForm && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Nouvel artisan</p>
                <ArtisanFormFields value={newArtisan} onChange={setNewArtisan} />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                  <Button size="sm" onClick={handleAddArtisan} disabled={!newArtisan.nom.trim()}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Artisan list */}
          {filteredArtisans.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground space-y-3">
                <Wrench className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm">Aucun artisan dans votre annuaire.</p>
                {!showForm && <Button size="sm" variant="outline" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un artisan</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredArtisans.map(a => (
                <Card key={a.id} className="border-0 shadow-sm"><CardContent className="p-4">
                  {editingId === a.id && editArtisan ? (
                    <div className="space-y-3">
                      <ArtisanFormFields value={editArtisan} onChange={v => setEditArtisan(v)} />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>Annuler</Button>
                        <Button size="sm" onClick={saveEdit} disabled={!editArtisan.nom.trim()}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{a.nom}</p>
                          <p className="text-xs text-muted-foreground">{a.specialites.map(s => artisanSpecialtyLabels[s] ?? s).join(", ") || "—"} · {a.ville}</p>
                          {a.address && <p className="text-xs text-muted-foreground mt-0.5">{a.address}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEdit(a)}>Modifier</Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mb-2"><span>{a.interventions} interventions</span><span>Délai: {a.delaiMoyen}</span></div>
                      <div className="flex gap-2 text-xs text-muted-foreground mb-2"><span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.telephone}</span><span className="flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</span></div>
                      {ticketsArtisan.length > 0 && <div className="flex gap-1 flex-wrap mt-2">{ticketsArtisan.map(t => <Button key={t.id} size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setContactPending({ artisan: a, ticket: t })}><Send className="h-2.5 w-2.5 mr-1" />{t.reference}</Button>)}</div>}
                    </>
                  )}
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3 mt-4">
          {ticketsArtisan.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucun ticket en recherche d'artisan</CardContent></Card> :
          ticketsArtisan.map(t => (
            <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <CardContent className="p-4 flex items-start justify-between">
                <div><div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span><Badge variant="outline" className={`status-badge border-0 ${statusColors[t.status]}`}>{statusLabels[t.status]}</Badge><Badge variant="secondary" className="text-[10px]">{categoryLabels[t.categorie]}</Badge></div><p className="font-medium text-sm">{t.titre}</p><p className="text-xs text-muted-foreground mt-1">{t.quotes.length} devis reçu(s)</p></div>
                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); navigate(`/tickets/${t.id}`); }}><Wrench className="h-3.5 w-3.5 mr-1" /> Gérer</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>

    <Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer cet artisan ? Cette action est irréversible.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
          <Button variant="destructive" onClick={() => { if (deleteConfirm) { removeArtisan(deleteConfirm); setDeleteConfirm(null); } }}>Supprimer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {contactPending && (
      <ArtisanContactModal
        open
        artisan={contactPending.artisan}
        ticket={contactPending.ticket}
        onClose={() => setContactPending(null)}
        onConfirm={(subject, content) => {
          sendArtisanContact(contactPending.ticket.id, contactPending.artisan.id, content, subject);
          setContactPending(null);
          navigate(`/tickets/${contactPending.ticket.id}`);
        }}
      />
    )}
    </>
  );
}
