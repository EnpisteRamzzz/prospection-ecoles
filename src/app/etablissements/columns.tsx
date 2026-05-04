"use client";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StatutContrat, StatutPipeline } from "@/generated/prisma/enums";

export type EtablissementRow = {
  uai: string;
  nomEtablissement: string;
  type: string;
  nature: string | null;
  statutContrat: StatutContrat;
  ville: string | null;
  departement: string | null;
  region: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  siret: string | null;
  publicFormiris: boolean;
  publicOpco: boolean;
  _count: { contacts: number; activites: number };
  pipelineEntries: { statut: StatutPipeline; canalFinancement: string }[];
};

const statutContratConfig: Record<
  StatutContrat,
  { label: string; className: string }
> = {
  SousContrat: {
    label: "Sous contrat",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  HorsContrat: {
    label: "Hors contrat",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  Inconnu: {
    label: "Inconnu",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
};

const statutPipelineConfig: Record<
  StatutPipeline,
  { label: string; className: string }
> = {
  AContacter: {
    label: "À contacter",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  Contacte: {
    label: "Contacté",
    className: "bg-sky-100 text-sky-700 border-sky-200",
  },
  Echange: {
    label: "Échange",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  RDV: {
    label: "RDV",
    className: "bg-violet-100 text-violet-700 border-violet-200",
  },
  Proposition: {
    label: "Proposition",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  Gagne: {
    label: "Gagné",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  Perdu: {
    label: "Perdu",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  Dormant: {
    label: "Dormant",
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
};

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };
}) {
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
    </button>
  );
}

const helper = createColumnHelper<EtablissementRow>();

export function useEtablissementColumns() {
  const router = useRouter();

  return [
    helper.accessor("nomEtablissement", {
      id: "nomEtablissement",
      header: ({ column }) => <SortableHeader label="Établissement" column={column} />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{row.original.nomEtablissement}</div>
          {row.original.ville && (
            <div className="text-xs text-muted-foreground truncate">{row.original.ville}</div>
          )}
        </div>
      ),
    }),

    helper.accessor("type", {
      id: "type",
      header: ({ column }) => <SortableHeader label="Type" column={column} />,
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue() || "—"}</span>
      ),
    }),

    helper.accessor("statutContrat", {
      id: "statutContrat",
      header: ({ column }) => <SortableHeader label="Statut" column={column} />,
      cell: ({ getValue }) => {
        const statut = getValue();
        const config = statutContratConfig[statut];
        return (
          <Badge className={config.className} variant="outline">
            {config.label}
          </Badge>
        );
      },
    }),

    helper.accessor("publicFormiris", {
      id: "publicFormiris",
      header: "Formiris",
      cell: ({ getValue }) => (
        <span className={getValue() ? "text-green-600 font-medium" : "text-muted-foreground"}>
          {getValue() ? "✓" : "—"}
        </span>
      ),
    }),

    helper.accessor("publicOpco", {
      id: "publicOpco",
      header: "OPCO",
      cell: ({ getValue }) => (
        <span className={getValue() ? "text-green-600 font-medium" : "text-muted-foreground"}>
          {getValue() ? "✓" : "—"}
        </span>
      ),
    }),

    helper.accessor("siteWeb", {
      id: "siteWeb",
      header: "Site web",
      cell: ({ getValue }) => {
        const url = getValue();
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <a
            href={url.startsWith("http") ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
          >
            Site
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    }),

    helper.accessor("pipelineEntries", {
      id: "pipeline",
      header: "Pipeline",
      enableSorting: false,
      cell: ({ getValue }) => {
        const entries = getValue();
        const first = entries[0];
        if (!first) return <span className="text-muted-foreground">—</span>;
        const config = statutPipelineConfig[first.statut];
        return (
          <Badge className={config.className} variant="outline">
            {config.label}
          </Badge>
        );
      },
    }),

    helper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/etablissements/${row.original.uai}`);
          }}
        >
          Voir
        </Button>
      ),
    }),
  ] as ColumnDef<EtablissementRow>[];
}
