import type { StatutContrat } from "@/generated/prisma/enums";
import { EtablissementsClient } from "./etablissements-client";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getString(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? "";
  return val ?? "";
}

function getBoolean(val: string | string[] | undefined): boolean | undefined {
  const s = getString(val);
  if (s === "true") return true;
  if (s === "false") return false;
  return undefined;
}

export default async function EtablissementsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const statutContratRaw = getString(params.statutContrat);
  const validStatuts: StatutContrat[] = ["SousContrat", "HorsContrat", "Inconnu"];
  const statutContrat = validStatuts.includes(statutContratRaw as StatutContrat)
    ? (statutContratRaw as StatutContrat)
    : undefined;

  const initialFilters = {
    search: getString(params.search) || undefined,
    region: getString(params.region) || undefined,
    departement: getString(params.departement) || undefined,
    statutContrat,
    type: getString(params.type) || undefined,
    hasSiteWeb: getBoolean(params.hasSiteWeb),
    hasEmail: getBoolean(params.hasEmail),
    publicFormiris: getBoolean(params.publicFormiris),
    publicOpco: getBoolean(params.publicOpco),
  };

  const initialView = getString(params.view) === "map" ? "map" : "list";
  const initialPage = Math.max(1, parseInt(getString(params.page) || "1", 10));
  const initialSortBy = getString(params.sortBy) || "nomEtablissement";
  const initialSortDir =
    getString(params.sortDir) === "desc" ? "desc" : "asc";

  return (
    <EtablissementsClient
      initialFilters={initialFilters}
      initialView={initialView as "list" | "map"}
      initialPage={initialPage}
      initialSortBy={initialSortBy}
      initialSortDir={initialSortDir as "asc" | "desc"}
    />
  );
}
