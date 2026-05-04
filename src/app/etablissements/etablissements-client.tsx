"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useTransition,
  useEffect,
} from "react";
import { Filter, LayoutList, Map, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StatutContrat } from "@/generated/prisma/enums";
import { useEtablissementColumns, type EtablissementRow } from "./columns";
import { MapView } from "@/components/etablissements/map-view";

interface Filters {
  search?: string;
  region?: string;
  departement?: string;
  statutContrat?: StatutContrat;
  type?: string;
  hasSiteWeb?: boolean;
  hasEmail?: boolean;
  publicFormiris?: boolean;
  publicOpco?: boolean;
}

interface EtablissementsClientProps {
  initialFilters: Filters;
  initialView: "list" | "map";
  initialPage: number;
  initialSortBy: string;
  initialSortDir: "asc" | "desc";
}

const PAGE_SIZE = 100;

function useUrlState(
  initialFilters: Filters,
  initialView: "list" | "map",
  initialPage: number,
  initialSortBy: string,
  initialSortDir: "asc" | "desc"
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // filtersBase never stores search — search comes from deferredSearch
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { search: _initSearch, ...initBase } = initialFilters;
  const [filtersBase, setFiltersBase] = useState<Filters>({ ...initBase });
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [view, setView] = useState<"list" | "map">(initialView);
  const [page, setPage] = useState(initialPage);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);

  const deferredSearch = useDeferredValue(searchInput);
  const isMounted = useRef(false);

  // Derived: full filters including search (no setState needed for search changes)
  const filters = useMemo<Filters>(
    () => ({ ...filtersBase, search: deferredSearch || undefined }),
    [filtersBase, deferredSearch]
  );

  const buildParams = useCallback(
    (
      f: Filters,
      v: "list" | "map",
      p: number,
      sBy: string,
      sDir: "asc" | "desc"
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      const set = (key: string, val: string | undefined) => {
        if (val) params.set(key, val);
        else params.delete(key);
      };
      set("search", f.search);
      set("region", f.region);
      set("departement", f.departement);
      set("statutContrat", f.statutContrat);
      set("type", f.type);
      if (f.hasSiteWeb !== undefined) params.set("hasSiteWeb", String(f.hasSiteWeb));
      else params.delete("hasSiteWeb");
      if (f.hasEmail !== undefined) params.set("hasEmail", String(f.hasEmail));
      else params.delete("hasEmail");
      if (f.publicFormiris !== undefined)
        params.set("publicFormiris", String(f.publicFormiris));
      else params.delete("publicFormiris");
      if (f.publicOpco !== undefined)
        params.set("publicOpco", String(f.publicOpco));
      else params.delete("publicOpco");
      if (v !== "list") params.set("view", v);
      else params.delete("view");
      if (p > 1) params.set("page", String(p));
      else params.delete("page");
      if (sBy !== "nomEtablissement") params.set("sortBy", sBy);
      else params.delete("sortBy");
      if (sDir !== "asc") params.set("sortDir", sDir);
      else params.delete("sortDir");
      return params.toString();
    },
    [searchParams]
  );

  const push = useCallback(
    (f: Filters, v: "list" | "map", p: number, sBy: string, sDir: "asc" | "desc") => {
      const qs = buildParams(f, v, p, sBy, sDir);
      router.push(`${pathname}?${qs}`, { scroll: false });
    },
    [router, pathname, buildParams]
  );

  const setFilters = useCallback(
    (next: Filters | ((prev: Filters) => Filters)) => {
      const current = typeof next === "function" ? next(filters) : next;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { search: _s, ...base } = current;
      setFiltersBase({ ...base });
      push(current, view, 1, sortBy, sortDir);
      setPage(1);
    },
    [filters, view, sortBy, sortDir, push]
  );

  const changeView = useCallback(
    (v: "list" | "map") => {
      setView(v);
      push(filters, v, page, sortBy, sortDir);
    },
    [filters, page, sortBy, sortDir, push]
  );

  const changePage = useCallback(
    (p: number) => {
      setPage(p);
      push(filters, view, p, sortBy, sortDir);
    },
    [filters, view, sortBy, sortDir, push]
  );

  const changeSort = useCallback(
    (sBy: string, sDir: "asc" | "desc") => {
      setSortBy(sBy);
      setSortDir(sDir);
      setPage(1);
      push(filters, view, 1, sBy, sDir);
    },
    [filters, view, push]
  );

  const resetFilters = useCallback(() => {
    setFiltersBase({});
    setSearchInput("");
    setPage(1);
    push({}, view, 1, sortBy, sortDir);
  }, [view, sortBy, sortDir, push]);

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    push({ ...filtersBase, search: deferredSearch || undefined }, view, 1, sortBy, sortDir);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch]);

  return {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    view,
    changeView,
    page,
    changePage,
    sortBy,
    sortDir,
    changeSort,
    resetFilters,
  };
}

function FilterSidebar({
  filters,
  setFilters,
  resetFilters,
  searchInput,
  setSearchInput,
  total,
}: {
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  resetFilters: () => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  total: number;
}) {
  const { data: filterOptions } = trpc.etablissement.filterOptions.useQuery();

  const filteredDepts = filterOptions?.departements ?? [];

  const hasActiveFilters =
    filters.search ||
    filters.region ||
    filters.departement ||
    filters.statutContrat ||
    filters.type ||
    filters.hasSiteWeb !== undefined ||
    filters.hasEmail !== undefined ||
    filters.publicFormiris !== undefined ||
    filters.publicOpco !== undefined;

  return (
    <aside className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {total.toLocaleString("fr-FR")} établissement{total !== 1 ? "s" : ""}
        </span>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Recherche
        </label>
        <Input
          placeholder="Nom, ville, UAI…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Région
        </label>
        <Select
          value={filters.region ?? "_all"}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              region: v === "_all" ? undefined : (v ?? undefined),
              departement: undefined,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les régions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Toutes les régions</SelectItem>
            {(filterOptions?.regions ?? []).map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Département
        </label>
        <Select
          value={filters.departement ?? "_all"}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              departement: v === "_all" ? undefined : (v ?? undefined),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les départements" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les départements</SelectItem>
            {filteredDepts.map((d) => (
              <SelectItem key={d.label} value={d.label}>
                {d.code ? `${d.code} – ` : ""}
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Statut contrat
        </label>
        <Select
          value={filters.statutContrat ?? "_all"}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              statutContrat:
                v === "_all" ? undefined : (v as StatutContrat),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous</SelectItem>
            <SelectItem value="SousContrat">Sous contrat</SelectItem>
            <SelectItem value="HorsContrat">Hors contrat</SelectItem>
            <SelectItem value="Inconnu">Inconnu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Type
        </label>
        <Select
          value={filters.type ?? "_all"}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              type: v === "_all" ? undefined : (v ?? undefined),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les types</SelectItem>
            {(filterOptions?.types ?? []).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Options
        </label>

        <CheckboxFilter
          label="Avec site web"
          checked={filters.hasSiteWeb === true}
          onCheckedChange={(v) =>
            setFilters((prev) => ({ ...prev, hasSiteWeb: v || undefined }))
          }
        />
        <CheckboxFilter
          label="Avec email"
          checked={filters.hasEmail === true}
          onCheckedChange={(v) =>
            setFilters((prev) => ({ ...prev, hasEmail: v || undefined }))
          }
        />
        <CheckboxFilter
          label="Formiris uniquement"
          checked={filters.publicFormiris === true}
          onCheckedChange={(v) =>
            setFilters((prev) => ({ ...prev, publicFormiris: v || undefined }))
          }
        />
        <CheckboxFilter
          label="OPCO uniquement"
          checked={filters.publicOpco === true}
          onCheckedChange={(v) =>
            setFilters((prev) => ({ ...prev, publicOpco: v || undefined }))
          }
        />
      </div>
    </aside>
  );
}

function CheckboxFilter({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={label}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
      />
      <label htmlFor={label} className="text-sm cursor-pointer">
        {label}
      </label>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}


export function EtablissementsClient({
  initialFilters,
  initialView,
  initialPage,
  initialSortBy,
  initialSortDir,
}: EtablissementsClientProps) {
  const {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    view,
    changeView,
    page,
    changePage,
    sortBy,
    sortDir,
    changeSort,
    resetFilters,
  } = useUrlState(
    initialFilters,
    initialView,
    initialPage,
    initialSortBy,
    initialSortDir
  );

  const [, startTransition] = useTransition();

  const { data, isFetching } = trpc.etablissement.list.useQuery(
    {
      filters,
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDir,
    },
    { placeholderData: (prev) => prev }
  );

  const columns = useEtablissementColumns();

  const sorting: SortingState = [{ id: sortBy, desc: sortDir === "desc" }];

  const table = useReactTable({
    data: (data?.items as EtablissementRow[]) ?? [],
    columns: columns as ColumnDef<EtablissementRow>[],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: data?.totalPages ?? -1,
    state: { sorting },
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      if (next.length > 0) {
        startTransition(() => {
          changeSort(next[0].id, next[0].desc ? "desc" : "asc");
        });
      }
    },
  });

  const router = useRouter();

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const sidebar = (
    <FilterSidebar
      filters={filters}
      setFilters={setFilters}
      resetFilters={resetFilters}
      searchInput={searchInput}
      setSearchInput={setSearchInput}
      total={total}
    />
  );

  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r p-4 sticky top-0 h-screen overflow-y-auto">
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 p-4 gap-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          {/* Mobile filter trigger */}
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium gap-2 lg:hidden hover:bg-accent hover:text-accent-foreground">
              <Filter className="h-4 w-4" />
              Filtres
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{sidebar}</div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 ml-auto">
            {isFetching && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Chargement…
              </span>
            )}
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => changeView("list")}
              aria-label="Vue liste"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => changeView("map")}
              aria-label="Vue carte"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {view === "map" ? (
          <MapView filters={filters} />
        ) : (
          <>
            {isFetching && !data ? (
              <TableSkeleton />
            ) : (
              <ScrollArea className="flex-1">
                <div
                  className={cn(
                    "rounded-md border transition-opacity",
                    isFetching && "opacity-60"
                  )}
                >
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                          {hg.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="text-center py-12 text-muted-foreground"
                          >
                            Aucun établissement trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              router.push(
                                `/etablissements/${row.original.uai}`
                              )
                            }
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 pt-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                Page {page} sur {totalPages} — {total.toLocaleString("fr-FR")}{" "}
                résultat{total !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => changePage(page - 1)}
                >
                  Précédent
                </Button>
                <div className="flex items-center gap-1">
                  {totalPages <= 7
                    ? Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <Button
                            key={p}
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 px-0"
                            onClick={() => changePage(p)}
                            disabled={isFetching}
                          >
                            {p}
                          </Button>
                        )
                      )
                    : (
                        <span className="text-sm px-2">
                          {page} / {totalPages}
                        </span>
                      )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => changePage(page + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
