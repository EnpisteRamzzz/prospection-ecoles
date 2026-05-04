"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/client";
import {
  StatutContrat,
  StatutPipeline,
  CanalFinancement,
  TypeActivite,
  ContactSource,
} from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmailComposer } from "@/components/composer/email-composer";

// ─── Catalogue formations ─────────────────────────────────────────────────────

const CATALOGUE: Record<string, string> = {
  "ia-pratique-enseignante": "IA & Pratique enseignante",
  "genially-enseigner": "Genially pour enseigner",
  "ia-genially-sequence": "IA + Genially — Créer une séquence",
  "ia-admin-direction": "IA pour l'administration et la direction",
  "genially-communication": "Genially pour la communication",
  "pack-productivite-ia": "Pack productivité IA",
};

// ─── Helpers badges ───────────────────────────────────────────────────────────

function statutContratLabel(s: StatutContrat) {
  if (s === StatutContrat.SousContrat) return "Sous contrat";
  if (s === StatutContrat.HorsContrat) return "Hors contrat";
  return "Inconnu";
}

function statutContratVariant(s: StatutContrat): "default" | "secondary" | "destructive" | "outline" {
  if (s === StatutContrat.SousContrat) return "default";
  if (s === StatutContrat.HorsContrat) return "secondary";
  return "outline";
}

function statutPipelineLabel(s: StatutPipeline) {
  const labels: Record<StatutPipeline, string> = {
    AContacter: "À contacter",
    Contacte: "Contacté",
    Echange: "Échange",
    RDV: "RDV",
    Proposition: "Proposition",
    Gagne: "Gagné",
    Perdu: "Perdu",
    Dormant: "Dormant",
  };
  return labels[s];
}

function sourceLabel(s: ContactSource) {
  const labels: Record<ContactSource, string> = {
    manual: "Manuel",
    scraping: "Scraping",
    linkedin: "LinkedIn",
    import: "Import",
  };
  return labels[s];
}

function typeActiviteIcon(t: TypeActivite): string {
  const icons: Record<TypeActivite, string> = {
    email: "✉",
    linkedin: "🔗",
    appel: "📞",
    reponse: "↩",
    note: "📝",
    rdv: "📅",
    simulation: "🔢",
  };
  return icons[t];
}

function dateRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an(s)`;
}

// ─── Squelette ────────────────────────────────────────────────────────────────

function FicheSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function FicheClient({ uai }: { uai: string }) {
  const { data: etablissement, isLoading, error } = trpc.etablissement.get.useQuery({ uai });

  if (isLoading) return <FicheSkeleton />;
  if (error || !etablissement) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg font-medium">Établissement non trouvé</p>
        <p className="text-muted-foreground">L&apos;UAI <code className="font-mono">{uai}</code> ne correspond à aucun établissement.</p>
        <Link href="/etablissements" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  return <FicheInner etablissement={etablissement} />;
}

// ─── Contenu de la fiche ──────────────────────────────────────────────────────

type EtabWithRelations = NonNullable<RouterOutputs["etablissement"]["get"]>;

function FicheInner({ etablissement: etab }: { etablissement: EtabWithRelations }) {
  const utils = trpc.useUtils();

  // État enrichissement
  const [contactDecisionnaire, setContactDecisionnaire] = useState(etab.contactDecisionnaire ?? "");
  const [fonctionContact, setFonctionContact] = useState(etab.fonctionContact ?? "");
  const [profilNotes, setProfilNotes] = useState(etab.profilPedagogiqueNotes ?? "");

  // État infos éditables
  const [telephone, setTelephone] = useState(etab.telephone ?? "");
  const [email, setEmail] = useState(etab.email ?? "");
  const [siteWeb, setSiteWeb] = useState(etab.siteWeb ?? "");

  // Pipeline
  const pipeline = etab.pipelineEntries[0] ?? null;
  const [pipelineStatut, setPipelineStatut] = useState<StatutPipeline>(
    pipeline?.statut ?? StatutPipeline.AContacter
  );
  const [pipelineCanal, setPipelineCanal] = useState<CanalFinancement | "">(
    pipeline?.canalFinancement ?? ""
  );
  const [valeurEstimee, setValeurEstimee] = useState<string>(
    pipeline?.valeurEstimee?.toString() ?? ""
  );
  const [probabilite, setProbabilite] = useState<number>(
    pipeline?.probabilite != null ? Math.round(pipeline.probabilite * 100) : 50
  );
  const [pipelineNotes, setPipelineNotes] = useState(pipeline?.notes ?? "");

  const updateMutation = trpc.etablissement.update.useMutation({
    onSuccess() {
      toast.success("Enrichissements enregistrés");
      utils.etablissement.get.invalidate({ uai: etab.uai });
    },
    onError(err) {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const updateInfosMutation = trpc.etablissement.update.useMutation({
    onSuccess() {
      toast.success("Informations mises à jour");
      utils.etablissement.get.invalidate({ uai: etab.uai });
    },
    onError(err) {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const updatePipelineMutation = trpc.etablissement.updatePipeline.useMutation({
    onSuccess() {
      toast.success("Pipeline mis à jour");
      utils.etablissement.get.invalidate({ uai: etab.uai });
    },
    onError(err) {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  function handleSaveInfos() {
    updateInfosMutation.mutate({
      uai: etab.uai,
      data: { telephone: telephone || undefined, email: email || undefined, siteWeb: siteWeb || undefined },
    });
  }

  function handleSaveEnrichissement() {
    updateMutation.mutate({
      uai: etab.uai,
      data: {
        contactDecisionnaire: contactDecisionnaire || undefined,
        fonctionContact: fonctionContact || undefined,
        profilPedagogiqueNotes: profilNotes || undefined,
      },
    });
  }

  function handleSavePipeline() {
    updatePipelineMutation.mutate({
      uai: etab.uai,
      statut: pipelineStatut,
      canalFinancement: pipelineCanal || undefined,
      valeurEstimee: valeurEstimee ? parseFloat(valeurEstimee) : undefined,
      probabilite: probabilite / 100,
      notes: pipelineNotes || undefined,
    });
  }

  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${etab.nomEtablissement} ${etab.ville ?? ""} directeur`
  )}`;

  const adresseComplete = [etab.adresse, etab.codePostal, etab.ville]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb & retour */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/etablissements" className="hover:text-foreground transition-colors">
          Établissements
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{etab.nomEtablissement}</span>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold leading-tight">{etab.nomEtablissement}</h1>
          <Link href="/etablissements" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            ← Établissements
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {etab.type && <Badge variant="outline">{etab.type}</Badge>}
          <Badge variant={statutContratVariant(etab.statutContrat)}>
            {statutContratLabel(etab.statutContrat)}
          </Badge>
          {etab.region && <Badge variant="secondary">{etab.region}</Badge>}
          {etab.departement && (
            <span className="text-sm text-muted-foreground">{etab.departement}</span>
          )}
        </div>

        {/* Deeplinks */}
        <div className="flex flex-wrap gap-2">
          {etab.siteWeb ? (
            <a
              href={etab.siteWeb}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Ouvrir le site
            </a>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Ouvrir le site
            </Button>
          )}
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Rechercher sur LinkedIn
          </a>
          <a
            href="https://code-idcc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Vérifier IDCC
          </a>

          {/* Composer email */}
          <Dialog>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              ✉ Rédiger un email
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Rédiger un email — {etab.nomEtablissement}</DialogTitle>
              </DialogHeader>
              <EmailComposer
                etablissement={{
                  uai: etab.uai,
                  nomEtablissement: etab.nomEtablissement,
                  ville: etab.ville,
                  type: etab.type,
                  statutContrat: etab.statutContrat,
                  publicFormiris: etab.publicFormiris,
                  publicOpco: etab.publicOpco,
                  formationsProposables: etab.formationsProposables,
                }}
                contacts={etab.contacts.map((c) => ({
                  id: c.id,
                  prenom: c.prenom,
                  nom: c.nom,
                  email: c.email,
                  fonction: c.fonction,
                }))}
                onClose={() => {
                  // Le Dialog se ferme via son propre état interne
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* Infos générales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">UAI</label>
              <Input value={etab.uai} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SIRET</label>
              <Input value={etab.siret ?? "—"} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Téléphone</label>
              <Input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                onBlur={handleSaveInfos}
                placeholder="Non renseigné"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleSaveInfos}
                type="email"
                placeholder="Non renseigné"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Site web</label>
              <Input
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
                onBlur={handleSaveInfos}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adresse</label>
              <Input value={adresseComplete || "—"} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">OPCO probable</label>
              <Input value={etab.opcoProb ?? "—"} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Éligibilités</label>
              <div className="flex gap-2 items-center h-9">
                {etab.publicFormiris ? (
                  <Badge variant="default">Formiris ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Formiris —</Badge>
                )}
                {etab.publicOpco ? (
                  <Badge variant="default">OPCO ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">OPCO —</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrichissement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrichissement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contact décisionnaire
              </label>
              <Input
                value={contactDecisionnaire}
                onChange={(e) => setContactDecisionnaire(e.target.value)}
                placeholder="Chef d'établissement, Directeur…"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fonction
              </label>
              <Input
                value={fonctionContact}
                onChange={(e) => setFonctionContact(e.target.value)}
                placeholder="Directeur, Chef de projet…"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes pédagogiques
            </label>
            <Textarea
              value={profilNotes}
              onChange={(e) => setProfilNotes(e.target.value)}
              placeholder="Profil pédagogique, besoins identifiés, contexte…"
              rows={4}
            />
          </div>
          <Button
            onClick={handleSaveEnrichissement}
            disabled={updateMutation.isPending}
            size="sm"
          >
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer les enrichissements"}
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline commercial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Statut
              </label>
              <Select
                value={pipelineStatut}
                onValueChange={(v) => setPipelineStatut(v as StatutPipeline)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(StatutPipeline).map((s) => (
                    <SelectItem key={s} value={s}>
                      {statutPipelineLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Canal de financement
              </label>
              <Select
                value={pipelineCanal}
                onValueChange={(v) => setPipelineCanal(v as CanalFinancement | "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Non défini" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Non défini</SelectItem>
                  {Object.values(CanalFinancement).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Valeur estimée (€)
              </label>
              <Input
                type="number"
                value={valeurEstimee}
                onChange={(e) => setValeurEstimee(e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Probabilité — {probabilite}%
              </label>
              <Slider
                value={[probabilite]}
                onValueChange={(v) => setProbabilite(Array.isArray(v) ? v[0] : v as number)}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes pipeline
            </label>
            <Textarea
              value={pipelineNotes}
              onChange={(e) => setPipelineNotes(e.target.value)}
              placeholder="Contexte, blocages, prochaine action…"
              rows={3}
            />
          </div>
          <Button
            onClick={handleSavePipeline}
            disabled={updatePipelineMutation.isPending}
            size="sm"
          >
            {updatePipelineMutation.isPending ? "Mise à jour…" : "Mettre à jour"}
          </Button>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Contacts{" "}
            {etab.contacts.length > 0 && (
              <span className="font-normal text-muted-foreground text-sm">
                ({etab.contacts.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {etab.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contact enregistré.</p>
          ) : (
            <div className="space-y-3">
              {etab.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-md border bg-muted/20"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-sm">
                      {[contact.prenom, contact.nom].filter(Boolean).join(" ") || "Sans nom"}
                    </p>
                    {contact.fonction && (
                      <p className="text-xs text-muted-foreground">{contact.fonction}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
                        >
                          {contact.email}
                        </a>
                      )}
                      {contact.telephone && (
                        <span className="text-xs text-muted-foreground">{contact.telephone}</span>
                      )}
                      {contact.linkedin && (
                        <a
                          href={contact.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {sourceLabel(contact.source)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activités */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Activités récentes{" "}
            {etab.activites.length > 0 && (
              <span className="font-normal text-muted-foreground text-sm">
                (20 dernières)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {etab.activites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
          ) : (
            <ol className="space-y-3">
              {etab.activites.map((activite) => (
                <li key={activite.id} className="flex gap-3 items-start">
                  <span className="text-lg leading-none mt-0.5" aria-hidden>
                    {typeActiviteIcon(activite.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium capitalize">{activite.type}</span>
                      {activite.canal && (
                        <Badge variant="outline" className="text-xs">
                          {activite.canal}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {dateRelative(activite.createdAt)}
                      </span>
                    </div>
                    {activite.objet && (
                      <p className="text-sm text-muted-foreground truncate">{activite.objet}</p>
                    )}
                    {activite.contenu && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {activite.contenu}
                      </p>
                    )}
                    {activite.contact && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[activite.contact.prenom, activite.contact.nom].filter(Boolean).join(" ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Formations proposables */}
      {etab.formationsProposables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formations proposables</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {etab.formationsProposables.map((slug) => (
                <li key={slug} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-sm">
                    {CATALOGUE[slug] ?? slug}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
