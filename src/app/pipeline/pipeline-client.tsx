"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { StatutPipeline, CanalFinancement } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

// ─── Config colonnes ──────────────────────────────────────────────────────────

const COLUMNS: { statut: StatutPipeline; label: string; color: string }[] = [
  { statut: StatutPipeline.AContacter, label: "À contacter", color: "bg-zinc-100" },
  { statut: StatutPipeline.Contacte, label: "Contacté", color: "bg-blue-50" },
  { statut: StatutPipeline.Echange, label: "Échange", color: "bg-indigo-50" },
  { statut: StatutPipeline.RDV, label: "RDV", color: "bg-violet-50" },
  { statut: StatutPipeline.Proposition, label: "Proposition", color: "bg-amber-50" },
  { statut: StatutPipeline.Gagne, label: "Gagné", color: "bg-green-50" },
  { statut: StatutPipeline.Perdu, label: "Perdu", color: "bg-red-50" },
  { statut: StatutPipeline.Dormant, label: "Dormant", color: "bg-gray-50" },
];

type BoardEntry = {
  id: string;
  etablissementId: string;
  statut: StatutPipeline;
  canalFinancement: CanalFinancement | null;
  valeurEstimee: number | null;
  probabilite: number | null;
  etablissement: {
    uai: string;
    nomEtablissement: string;
    ville: string | null;
    type: string;
    region: string | null;
    statutContrat: string;
    publicFormiris: boolean;
    publicOpco: boolean;
    _count: { contacts: number; activites: number };
  };
};

// ─── Card draggable ───────────────────────────────────────────────────────────

function KanbanCard({ entry, isDragging }: { entry: BoardEntry; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: entry.etablissementId,
    data: { entry },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-lg border bg-white px-3 py-2.5 shadow-sm cursor-grab active:cursor-grabbing select-none space-y-1.5 touch-none"
    >
      <Link
        href={`/etablissements/${entry.etablissementId}`}
        className="text-sm font-medium leading-tight hover:underline line-clamp-2 block"
        onClick={(e) => e.stopPropagation()}
      >
        {entry.etablissement.nomEtablissement}
      </Link>
      <div className="flex flex-wrap gap-1 items-center">
        {entry.etablissement.ville && (
          <span className="text-xs text-zinc-500">{entry.etablissement.ville}</span>
        )}
        {entry.canalFinancement && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
            {entry.canalFinancement}
          </Badge>
        )}
      </div>
      {entry.valeurEstimee != null && (
        <p className="text-xs text-zinc-500">
          {entry.valeurEstimee.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          {entry.probabilite != null && (
            <span className="ml-1 text-zinc-400">× {Math.round(entry.probabilite * 100)}%</span>
          )}
        </p>
      )}
      <div className="flex gap-2 text-[10px] text-zinc-400">
        <span>{entry.etablissement._count.contacts} contact{entry.etablissement._count.contacts !== 1 ? "s" : ""}</span>
        <span>{entry.etablissement._count.activites} activité{entry.etablissement._count.activites !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

// ─── Colonne droppable ────────────────────────────────────────────────────────

function KanbanColumn({
  statut,
  label,
  color,
  entries,
  activeId,
}: {
  statut: StatutPipeline;
  label: string;
  color: string;
  entries: BoardEntry[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statut });

  return (
    <div className="flex flex-col min-w-[220px] max-w-[220px]">
      <div className={`rounded-t-lg px-3 py-2 ${color} border border-b-0`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">{label}</span>
          <span className="text-xs text-zinc-500 bg-white/60 rounded-full px-1.5">{entries.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] rounded-b-lg border p-2 space-y-2 transition-colors ${
          isOver ? "bg-blue-50/60 border-blue-300" : "bg-zinc-50/50"
        }`}
      >
        {entries.map((entry) => (
          <KanbanCard
            key={entry.etablissementId}
            entry={entry}
            isDragging={activeId === entry.etablissementId}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Client principal ─────────────────────────────────────────────────────────

export function PipelineClient() {
  const [filterCanal, setFilterCanal] = useState<CanalFinancement | "">("");
  const [filterRegion, setFilterRegion] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: board, isLoading } = trpc.pipeline.board.useQuery({
    canalFinancement: (filterCanal as CanalFinancement) || undefined,
  });

  const { data: filterOptions } = trpc.etablissement.filterOptions.useQuery();

  const moveMutation = trpc.pipeline.move.useMutation({
    onSuccess: () => utils.pipeline.board.invalidate(),
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Carte active (pour DragOverlay)
  const activeEntry = activeId
    ? Object.values(board ?? {}).flat().find((e) => (e as BoardEntry).etablissementId === activeId) as BoardEntry | undefined
    : undefined;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const fromEntry = Object.values(board ?? {})
      .flat()
      .find((e) => (e as BoardEntry).etablissementId === active.id) as BoardEntry | undefined;

    const toStatut = over.id as StatutPipeline;
    if (!fromEntry || fromEntry.statut === toStatut) return;

    moveMutation.mutate({ etablissementId: fromEntry.etablissementId, statut: toStatut });
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((c) => (
            <Skeleton key={c.statut} className="min-w-[220px] h-[500px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-white shrink-0">
        <h1 className="text-base font-semibold mr-2">Pipeline</h1>
        <Select
          value={filterCanal || undefined}
          onValueChange={(v) => setFilterCanal((v ?? "") as CanalFinancement | "")}
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Tous les canaux" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CanalFinancement.Formiris}>Formiris</SelectItem>
            <SelectItem value={CanalFinancement.OPCO}>OPCO</SelectItem>
            <SelectItem value={CanalFinancement.Mixte}>Mixte</SelectItem>
          </SelectContent>
        </Select>
        {filterCanal && (
          <button
            type="button"
            onClick={() => setFilterCanal("")}
            className="text-xs text-zinc-400 hover:text-zinc-700 px-1"
            title="Réinitialiser"
          >
            ✕
          </button>
        )}
        <Select value={filterRegion} onValueChange={(v) => setFilterRegion(v === "_all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Région" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Toutes les régions</SelectItem>
            {filterOptions?.regions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-zinc-400">
          {Object.values(board ?? {}).flat().length} entrées — glisser-déposer pour déplacer
        </span>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto flex-1 p-6 pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.statut}
              statut={col.statut}
              label={col.label}
              color={col.color}
              entries={(board?.[col.statut] ?? []) as BoardEntry[]}
              activeId={activeId}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeEntry ? (
            <div className="rotate-1 shadow-xl opacity-90">
              <KanbanCard entry={activeEntry} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
