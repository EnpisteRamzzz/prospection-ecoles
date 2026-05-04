"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Section stats ────────────────────────────────────────────────────────────

function StatsSection() {
  const { data, isLoading } = trpc.admin.stats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const stats = [
    { label: "Établissements", value: data.totalEtab.toLocaleString("fr-FR") },
    { label: "Avec site web", value: data.avecSiteWeb.toLocaleString("fr-FR") },
    { label: "Géocodés", value: data.geocodés.toLocaleString("fr-FR") },
    { label: "Contacts total", value: data.totalContacts.toLocaleString("fr-FR") },
    { label: "Via scraping", value: data.contactsScraping.toLocaleString("fr-FR") },
    { label: "Manuel", value: data.contactsManuels.toLocaleString("fr-FR") },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-xs text-zinc-500">{s.label}</p>
          <p className="text-xl font-bold text-zinc-900">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Section scraping ─────────────────────────────────────────────────────────

function ScrapingSection() {
  const utils = trpc.useUtils();
  const [limit, setLimit] = useState(50);
  const [confirmReset, setConfirmReset] = useState(false);

  const triggerScrape = trpc.admin.triggerScrape.useMutation({
    onSuccess: () => {
      toast.success(`Scraping lancé pour ${limit} établissements — résultats dans quelques minutes`);
      setTimeout(() => utils.admin.stats.invalidate(), 3000);
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  const triggerGeocode = trpc.admin.triggerGeocode.useMutation({
    onSuccess: () => toast.success("Géocodage lancé en arrière-plan"),
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  const resetScraping = trpc.admin.resetAllScrapingContacts.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.deleted} contacts scraping supprimés`);
      utils.admin.stats.invalidate();
      setConfirmReset(false);
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enrichissement automatique</CardTitle>
        <CardDescription>
          Le scraping visite les pages /equipe, /contact et /direction des établissements ayant un
          site web pour extraire le chef d&apos;établissement. Vitesse : 1 req/sec, robots.txt
          respecté, User-Agent identifiable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Limite :</label>
            <select
              className="rounded-md border px-2 py-1 text-sm bg-background"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n} établissements</option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => triggerScrape.mutate({ limit })}
            disabled={triggerScrape.isPending}
          >
            {triggerScrape.isPending ? "Lancement…" : "Lancer le scraping"}
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerGeocode.mutate()}
            disabled={triggerGeocode.isPending}
          >
            {triggerGeocode.isPending ? "Lancement…" : "Lancer le géocodage"}
          </Button>
        </div>
        <p className="text-xs text-zinc-400">
          Le worker Inngest s&apos;exécute en arrière-plan. Rechargez la page après quelques minutes
          pour voir les contacts ajoutés.
        </p>
        <Separator />
        <div>
          <p className="text-sm font-medium text-destructive mb-2">Zone de danger</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmReset(true)}
          >
            Supprimer tous les contacts scraping
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Cette action supprimera définitivement tous les contacts issus du scraping automatique.
            Les contacts ajoutés manuellement ne seront pas affectés.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={resetScraping.isPending}
              onClick={() => resetScraping.mutate()}
            >
              {resetScraping.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Section export RGPD ──────────────────────────────────────────────────────

function ExportSection() {
  const [exporting, setExporting] = useState<string | null>(null);
  const utils = trpc.useUtils();

  async function handleExport(type: "etablissements" | "contacts" | "activites") {
    setExporting(type);
    try {
      const data = await utils.admin.exportData.fetch({ type });
      const ts = new Date().toISOString().slice(0, 10);
      downloadJson(data, `prospection-${type}-${ts}.json`);
      toast.success(`Export ${type} téléchargé`);
    } catch (e) {
      toast.error(`Erreur d'export : ${e instanceof Error ? e.message : "inconnue"}`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export des données</CardTitle>
        <CardDescription>
          Téléchargez vos données au format JSON — portabilité et conformité RGPD.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {(["etablissements", "contacts", "activites"] as const).map((type) => (
          <Button
            key={type}
            variant="outline"
            disabled={exporting === type}
            onClick={() => handleExport(type)}
          >
            {exporting === type ? "Export…" : `Exporter ${type}`}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Section RGPD ─────────────────────────────────────────────────────────────

function RgpdSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Conformité RGPD
          <Badge variant="outline" className="text-xs font-normal">BtoB</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-600">
        <p>
          Les données collectées concernent exclusivement des personnes morales (établissements
          scolaires privés) et leurs représentants légaux dans un cadre professionnel BtoB.
          La base légale est l&apos;<strong>intérêt légitime</strong> (RGPD art. 6.1.f).
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Données sources : annuaires officiels MENJ, pages publiques des établissements</li>
          <li>Durée de conservation : 3 ans après le dernier contact</li>
          <li>Droit d&apos;opposition : mentionné dans chaque email (pied de page RGPD)</li>
          <li>Scraping : limité aux pages publiques, robots.txt respecté, UA identifiable</li>
          <li>Pas de transfert de données hors UE</li>
        </ul>
        <p className="text-xs text-zinc-400">
          Pour exercer un droit d&apos;effacement ou d&apos;opposition sur un contact spécifique,
          accédez à la fiche établissement → onglet Contacts → Supprimer.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function DonneesClient() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres — Données & RGPD</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestion des données, enrichissement et conformité</p>
      </div>

      <StatsSection />
      <ScrapingSection />
      <ExportSection />
      <RgpdSection />
    </div>
  );
}
