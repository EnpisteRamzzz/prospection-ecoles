"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Link2, Phone, Users, ChevronRight, Plus, Search } from "lucide-react";
import { useDeferredValue } from "react";

interface StepInfo {
  jour: number;
  canal: string;
  templateSlug: string;
  description?: string;
}

function CanalIcon({ canal }: { canal: string }) {
  if (canal === "email") return <Mail className="size-3.5 text-blue-600" />;
  if (canal === "linkedin") return <Link2 className="size-3.5 text-purple-600" />;
  if (canal === "appel") return <Phone className="size-3.5 text-green-600" />;
  return null;
}

function CanalBadge({ canal }: { canal: string }) {
  if (canal === "email")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><Mail className="size-3" />Email</Badge>;
  if (canal === "linkedin")
    return <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1"><Link2 className="size-3" />LinkedIn</Badge>;
  if (canal === "appel")
    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><Phone className="size-3" />Appel</Badge>;
  return <Badge>{canal}</Badge>;
}

// ─── Sheet détail séquence ────────────────────────────────────────────────────

function SequenceDetailSheet({
  sequenceId,
  open,
  onOpenChange,
}: {
  sequenceId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: sequence, isLoading } = trpc.sequence.get.useQuery(
    { id: sequenceId! },
    { enabled: !!sequenceId }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps = ((sequence as any)?.steps ?? []) as StepInfo[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sequence?.nom ?? "Détails de la séquence"}</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex flex-col gap-3 px-4 py-6">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        )}

        {!isLoading && sequence && (
          <div className="flex flex-col gap-6 px-4 py-6">
            {sequence.description && (
              <p className="text-sm text-muted-foreground">{sequence.description}</p>
            )}
            {sequence.pitchType && (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Type</span>
                <Badge variant="outline">{sequence.pitchType}</Badge>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3">Étapes ({steps.length})</h3>
              <div className="flex flex-col gap-2">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">J+{step.jour}</span>
                        <CanalBadge canal={step.canal} />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{step.templateSlug}</span>
                      {step.description && (
                        <span className="text-xs text-muted-foreground">{step.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {sequence.enrollments && sequence.enrollments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Enrollments actifs ({sequence.enrollments.length})
                </h3>
                <div className="flex flex-col gap-1.5">
                  {sequence.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="font-medium truncate">
                        {enrollment.etablissement.nomEtablissement}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {enrollment.etablissement.ville}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Dialog inscrire un établissement ────────────────────────────────────────

function EnrollDialog({
  open,
  onOpenChange,
  sequences,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sequences: Array<{ id: string; nom: string }>;
}) {
  const [search, setSearch] = useState("");
  const [selectedEtabId, setSelectedEtabId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("");
  const deferredSearch = useDeferredValue(search);
  const utils = trpc.useUtils();

  const { data: etabResult, isLoading: isLoadingEtab } = trpc.etablissement.list.useQuery(
    {
      filters: { search: deferredSearch },
      page: 1,
      pageSize: 10,
    },
    { enabled: deferredSearch.length >= 2 }
  );

  const enroll = trpc.sequence.enroll.useMutation({
    onSuccess: () => {
      utils.sequence.list.invalidate();
      utils.sequence.todayActions.invalidate();
      onOpenChange(false);
      setSearch("");
      setSelectedEtabId(null);
      setSelectedSequenceId("");
    },
  });

  const selectedEtab = etabResult?.items.find((e) => e.uai === selectedEtabId);

  function handleSubmit() {
    if (!selectedEtabId || !selectedSequenceId) return;
    enroll.mutate({
      etablissementId: selectedEtabId,
      sequenceId: selectedSequenceId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrire un établissement</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Recherche établissement */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Établissement</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou ville..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedEtabId(null);
                }}
                className="pl-8"
              />
            </div>

            {deferredSearch.length >= 2 && (
              <div className="rounded-md border bg-popover shadow-sm overflow-hidden">
                {isLoadingEtab && (
                  <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                )}
                {!isLoadingEtab && etabResult?.items.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">Aucun résultat</div>
                )}
                {!isLoadingEtab && etabResult && etabResult.items.length > 0 && (
                  <ScrollArea className="max-h-48">
                    {etabResult.items.map((etab) => (
                      <button
                        key={etab.uai}
                        type="button"
                        onClick={() => {
                          setSelectedEtabId(etab.uai);
                          setSearch(etab.nomEtablissement);
                        }}
                        className={`w-full flex flex-col items-start px-3 py-2 text-sm hover:bg-muted transition-colors ${
                          selectedEtabId === etab.uai ? "bg-muted" : ""
                        }`}
                      >
                        <span className="font-medium">{etab.nomEtablissement}</span>
                        <span className="text-xs text-muted-foreground">{etab.ville}</span>
                      </button>
                    ))}
                  </ScrollArea>
                )}
              </div>
            )}

            {selectedEtab && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">{selectedEtab.nomEtablissement}</span>
                {selectedEtab.ville && (
                  <span className="text-muted-foreground"> — {selectedEtab.ville}</span>
                )}
              </div>
            )}
          </div>

          {/* Choix de la séquence */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Séquence</label>
            <Select value={selectedSequenceId} onValueChange={(v) => setSelectedSequenceId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une séquence..." />
              </SelectTrigger>
              <SelectContent>
                {sequences.map((seq) => (
                  <SelectItem key={seq.id} value={seq.id}>
                    {seq.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {enroll.error && (
            <p className="text-sm text-destructive">{enroll.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            disabled={!selectedEtabId || !selectedSequenceId || enroll.isPending}
            onClick={handleSubmit}
          >
            {enroll.isPending ? "Inscription..." : "Inscrire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function SequencesClient() {
  const [detailSequenceId, setDetailSequenceId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  const { data: sequences, isLoading } = trpc.sequence.list.useQuery();

  function openDetail(id: string) {
    setDetailSequenceId(id);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Séquences</h1>
          <p className="text-muted-foreground text-sm">
            Gérez les séquences multi-touch et les inscriptions
          </p>
        </div>
        <Button
          onClick={() => setEnrollDialogOpen(true)}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Inscrire un établissement
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && sequences && sequences.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
          <p className="text-lg font-medium">Aucune séquence active</p>
          <p className="text-sm">Créez des séquences dans votre base de données.</p>
        </div>
      )}

      {!isLoading && sequences && sequences.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(sequences as any[]).map((sequence) => {
            const steps = (sequence.steps ?? []) as StepInfo[];
            const activeCount = sequence._count.enrollments;

            return (
              <Card key={sequence.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{sequence.nom}</CardTitle>
                    {sequence.pitchType && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {sequence.pitchType}
                      </Badge>
                    )}
                  </div>
                  {sequence.description && (
                    <CardDescription className="line-clamp-2">
                      {sequence.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Steps preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
                        title={step.description ?? step.templateSlug}
                      >
                        <CanalIcon canal={step.canal} />
                        <span className="text-muted-foreground">J+{step.jour}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="size-3.5" />
                      <span>{activeCount} enrollment{activeCount !== 1 ? "s" : ""} actif{activeCount !== 1 ? "s" : ""}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => openDetail(sequence.id)}
                    >
                      Voir les détails
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SequenceDetailSheet
        sequenceId={detailSequenceId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <EnrollDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        sequences={(sequences as { id: string; nom: string }[] | undefined)?.map((s) => ({ id: s.id, nom: s.nom })) ?? []}
      />
    </div>
  );
}
