import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";
import { StatutContrat, StatutPipeline, CanalFinancement } from "@/generated/prisma/client";

// ─── Parsing CSV ─────────────────────────────────────────────────────────────

function parseStatutContrat(raw: string): StatutContrat {
  const v = raw.trim();
  if (v === "Sous contrat") return StatutContrat.SousContrat;
  if (v === "Hors contrat") return StatutContrat.HorsContrat;
  return StatutContrat.Inconnu;
}

// Dérive Formiris/OPCO/formations selon le statut contractuel
function derivePublics(statut: StatutContrat) {
  const all = [
    "ia-pratique-enseignante",
    "genially-enseigner",
    "ia-genially-sequence",
    "ia-admin-direction",
    "genially-communication",
    "pack-productivite-ia",
  ];
  if (statut === StatutContrat.SousContrat) {
    return { publicFormiris: true, publicOpco: true, formationsProposables: all };
  }
  if (statut === StatutContrat.HorsContrat) {
    // Hors contrat : tout l'effectif finançable OPCO, pas de Formiris
    return { publicFormiris: false, publicOpco: true, formationsProposables: all };
  }
  return { publicFormiris: false, publicOpco: false, formationsProposables: [] };
}

function parseCsvLine(line: string): string[] {
  return line.split(";").map((v) => v.trim());
}

// ─── Schéma de filtres partagé ────────────────────────────────────────────────

const FilterSchema = z.object({
  search: z.string().optional(),
  region: z.string().optional(),
  departement: z.string().optional(),
  statutContrat: z.enum(["SousContrat", "HorsContrat", "Inconnu"]).optional(),
  type: z.string().optional(),
  hasSiteWeb: z.boolean().optional(),
  hasContact: z.boolean().optional(),
  hasEmail: z.boolean().optional(),
  statutPipeline: z.nativeEnum(StatutPipeline).optional(),
  publicFormiris: z.boolean().optional(),
  publicOpco: z.boolean().optional(),
});

type Filters = z.infer<typeof FilterSchema>;

function buildWhere(filters: Filters) {
  const where: Record<string, unknown> = {};
  if (filters.search) {
    where.OR = [
      { nomEtablissement: { contains: filters.search, mode: "insensitive" } },
      { ville: { contains: filters.search, mode: "insensitive" } },
      { uai: { contains: filters.search, mode: "insensitive" } },
      { siret: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.region) where.region = filters.region;
  if (filters.departement) where.departement = filters.departement;
  if (filters.statutContrat)
    where.statutContrat = filters.statutContrat as StatutContrat;
  if (filters.type) where.type = filters.type;
  if (filters.hasSiteWeb !== undefined)
    where.siteWeb = filters.hasSiteWeb ? { not: null } : null;
  if (filters.hasEmail !== undefined)
    where.email = filters.hasEmail ? { not: null } : null;
  if (filters.publicFormiris !== undefined)
    where.publicFormiris = filters.publicFormiris;
  if (filters.publicOpco !== undefined)
    where.publicOpco = filters.publicOpco;
  if (filters.hasContact) {
    where.contacts = { some: {} };
  }
  if (filters.statutPipeline) {
    where.pipelineEntries = {
      some: { statut: filters.statutPipeline },
    };
  }
  return where;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const etablissementRouter = router({
  // Import CSV complet
  importCsv: publicProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const raw = input.content.replace(/^﻿/, "");
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw new Error("CSV vide ou sans données");

      const header = parseCsvLine(lines[0]);
      const idx = {
        uai: header.indexOf("UAI"),
        nom: header.indexOf("nom_etablissement"),
        type: header.indexOf("type"),
        nature: header.indexOf("nature"),
        typeContratBrut: header.indexOf("type_contrat_brut"),
        statutContrat: header.indexOf("statut_contrat"),
        adresse: header.indexOf("adresse"),
        codePostal: header.indexOf("code_postal"),
        ville: header.indexOf("ville"),
        codeDept: header.indexOf("code_dept"),
        departement: header.indexOf("departement"),
        region: header.indexOf("region"),
        telephone: header.indexOf("telephone"),
        email: header.indexOf("email"),
        siteWeb: header.indexOf("site_web"),
        siret: header.indexOf("siret"),
        opcoProb: header.indexOf("OPCO_probable"),
        etat: header.indexOf("etat"),
      };
      if (idx.uai === -1) throw new Error("Colonne UAI introuvable");

      const dataLines = lines.slice(1);
      let added = 0;
      let updated = 0;
      const errors: string[] = [];

      const BATCH = 100;
      for (let i = 0; i < dataLines.length; i += BATCH) {
        const batch = dataLines.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (line, batchIdx) => {
            const cols = parseCsvLine(line);
            const uai = cols[idx.uai];
            if (!uai) {
              errors.push(`Ligne ${i + batchIdx + 2} : UAI manquant`);
              return;
            }
            const statut = parseStatutContrat(cols[idx.statutContrat] ?? "");
            const { publicFormiris, publicOpco, formationsProposables } =
              derivePublics(statut);
            const data = {
              nomEtablissement: cols[idx.nom] ?? "",
              type: cols[idx.type] ?? "",
              nature: cols[idx.nature] || null,
              typeContratBrut: cols[idx.typeContratBrut] || null,
              statutContrat: statut,
              adresse: cols[idx.adresse] || null,
              codePostal: cols[idx.codePostal] || null,
              ville: cols[idx.ville] || null,
              codeDept: cols[idx.codeDept] || null,
              departement: cols[idx.departement] || null,
              region: cols[idx.region] || null,
              telephone: cols[idx.telephone] || null,
              email: cols[idx.email] || null,
              siteWeb: cols[idx.siteWeb] || null,
              siret: cols[idx.siret] || null,
              opcoProb: cols[idx.opcoProb] || null,
              publicFormiris,
              publicOpco,
              formationsProposables,
              etat: cols[idx.etat] || "Ouvert",
            };
            const result = await ctx.prisma.etablissement.upsert({
              where: { uai },
              create: { uai, ...data },
              update: data,
              select: { uai: true, updatedAt: true, createdAt: true },
            });
            if (result.createdAt.getTime() === result.updatedAt.getTime()) {
              added++;
            } else {
              updated++;
            }
          })
        );
      }
      return { total: dataLines.length, added, updated, errors: errors.slice(0, 20) };
    }),

  // Liste filtrée et paginée
  list: publicProcedure
    .input(
      z.object({
        filters: FilterSchema.optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(500).default(100),
        sortBy: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filters = {}, page, pageSize, sortBy = "nomEtablissement", sortDir = "asc" } = input;
      const where = buildWhere(filters);

      const [total, items] = await Promise.all([
        ctx.prisma.etablissement.count({ where }),
        ctx.prisma.etablissement.findMany({
          where,
          orderBy: { [sortBy]: sortDir },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            _count: { select: { contacts: true, activites: true } },
            pipelineEntries: { select: { statut: true, canalFinancement: true } },
          },
        }),
      ]);

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  // Toutes les valeurs distinctes pour les dropdowns de filtre
  filterOptions: publicProcedure.query(async ({ ctx }) => {
    const [regions, departements, types] = await Promise.all([
      ctx.prisma.etablissement.findMany({
        where: { region: { not: null } },
        select: { region: true },
        distinct: ["region"],
        orderBy: { region: "asc" },
      }),
      ctx.prisma.etablissement.findMany({
        where: { departement: { not: null } },
        select: { departement: true, codeDept: true },
        distinct: ["departement"],
        orderBy: { departement: "asc" },
      }),
      ctx.prisma.etablissement.findMany({
        where: { type: { not: "" } },
        select: { type: true },
        distinct: ["type"],
        orderBy: { type: "asc" },
      }),
    ]);
    return {
      regions: regions.map((r) => r.region!),
      departements: departements.map((d) => ({ label: d.departement!, code: d.codeDept ?? "" })),
      types: types.map((t) => t.type),
    };
  }),

  // Points géo pour la carte (uniquement les établissements géocodés)
  mapPoints: publicProcedure
    .input(FilterSchema.optional())
    .query(async ({ ctx, input }) => {
      const where = { ...buildWhere(input ?? {}), latitude: { not: null } };
      return ctx.prisma.etablissement.findMany({
        where,
        select: {
          uai: true,
          nomEtablissement: true,
          ville: true,
          latitude: true,
          longitude: true,
          statutContrat: true,
          type: true,
          publicFormiris: true,
          publicOpco: true,
        },
      });
    }),

  // Détail d'un établissement
  get: publicProcedure
    .input(z.object({ uai: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.etablissement.findUnique({
        where: { uai: input.uai },
        include: {
          contacts: { orderBy: { createdAt: "desc" } },
          activites: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { contact: { select: { prenom: true, nom: true } } },
          },
          pipelineEntries: true,
        },
      });
    }),

  // Mise à jour partielle (enrichissement manuel)
  update: publicProcedure
    .input(
      z.object({
        uai: z.string(),
        data: z.object({
          contactDecisionnaire: z.string().optional(),
          fonctionContact: z.string().optional(),
          profilPedagogiqueNotes: z.string().optional(),
          telephone: z.string().optional(),
          email: z.string().optional(),
          siteWeb: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.etablissement.update({
        where: { uai: input.uai },
        data: input.data,
      });
    }),

  // Mise à jour statut pipeline
  updatePipeline: publicProcedure
    .input(
      z.object({
        uai: z.string(),
        statut: z.nativeEnum(StatutPipeline),
        canalFinancement: z.nativeEnum(CanalFinancement).optional(),
        valeurEstimee: z.number().optional(),
        probabilite: z.number().min(0).max(1).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { uai, ...pipelineData } = input;
      return ctx.prisma.pipelineEntry.upsert({
        where: { etablissementId: uai },
        create: { etablissementId: uai, ...pipelineData },
        update: { ...pipelineData, movedAt: new Date() },
      });
    }),

  // Counts pour le dashboard rapide
  count: publicProcedure.query(({ ctx }) => ctx.prisma.etablissement.count()),

  countByStatut: publicProcedure.query(async ({ ctx }) => {
    const [sousContrat, horsContrat, inconnu] = await Promise.all([
      ctx.prisma.etablissement.count({ where: { statutContrat: StatutContrat.SousContrat } }),
      ctx.prisma.etablissement.count({ where: { statutContrat: StatutContrat.HorsContrat } }),
      ctx.prisma.etablissement.count({ where: { statutContrat: StatutContrat.Inconnu } }),
    ]);
    return { sousContrat, horsContrat, inconnu };
  }),
});
