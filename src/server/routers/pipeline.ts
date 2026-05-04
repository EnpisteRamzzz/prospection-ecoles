import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";
import { StatutPipeline, CanalFinancement } from "@/generated/prisma/client";

export const pipelineRouter = router({
  // Board kanban : toutes les PipelineEntries avec données établissement
  board: publicProcedure
    .input(z.object({
      region: z.string().optional(),
      departement: z.string().optional(),
      canalFinancement: z.nativeEnum(CanalFinancement).optional(),
      type: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input?.region) where.etablissement = { region: input.region };
      if (input?.canalFinancement) where.canalFinancement = input.canalFinancement;

      const entries = await ctx.prisma.pipelineEntry.findMany({
        where,
        include: {
          etablissement: {
            select: {
              uai: true,
              nomEtablissement: true,
              ville: true,
              type: true,
              region: true,
              departement: true,
              statutContrat: true,
              publicFormiris: true,
              publicOpco: true,
              email: true,
              siteWeb: true,
              _count: { select: { contacts: true, activites: true } },
            },
          },
        },
        orderBy: { movedAt: "desc" },
      });

      // Grouper par statut
      const columns: Record<StatutPipeline, typeof entries> = {
        AContacter: [],
        Contacte: [],
        Echange: [],
        RDV: [],
        Proposition: [],
        Gagne: [],
        Perdu: [],
        Dormant: [],
      };

      for (const entry of entries) {
        columns[entry.statut].push(entry);
      }

      return columns;
    }),

  // KPIs dashboard
  kpis: publicProcedure.query(async ({ ctx }) => {
    const [
      totalEtablissements,
      totalPipeline,
      byStatut,
      caGagneRaw,
      caPondereRaw,
      activitesByWeek,
      reponses,
      emailsEnvoyes,
    ] = await Promise.all([
      ctx.prisma.etablissement.count(),
      ctx.prisma.pipelineEntry.count(),
      ctx.prisma.pipelineEntry.groupBy({
        by: ["statut"],
        _count: { _all: true },
      }),
      ctx.prisma.pipelineEntry.aggregate({
        where: { statut: StatutPipeline.Gagne },
        _sum: { valeurEstimee: true },
      }),
      ctx.prisma.pipelineEntry.findMany({
        where: {
          statut: { notIn: [StatutPipeline.Perdu, StatutPipeline.Dormant] },
          valeurEstimee: { not: null },
          probabilite: { not: null },
        },
        select: { valeurEstimee: true, probabilite: true, canalFinancement: true },
      }),
      // Activités par semaine (4 dernières semaines)
      ctx.prisma.activite.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 28 * 86400000) },
          type: "email",
        },
        select: { createdAt: true },
      }),
      ctx.prisma.activite.count({ where: { type: "reponse" } }),
      ctx.prisma.activite.count({ where: { type: "email" } }),
    ]);

    const statutCounts = Object.fromEntries(
      byStatut.map((g) => [g.statut, g._count._all])
    ) as Record<string, number>;

    // CA pondéré = sum(valeur * probabilite)
    const caPondere = caPondereRaw.reduce(
      (sum, e) => sum + (e.valeurEstimee ?? 0) * (e.probabilite ?? 0.5),
      0
    );

    // CA pondéré split Formiris / OPCO
    const caPondereFormiris = caPondereRaw
      .filter((e) => e.canalFinancement === CanalFinancement.Formiris)
      .reduce((sum, e) => sum + (e.valeurEstimee ?? 0) * (e.probabilite ?? 0.5), 0);
    const caPondereOpco = caPondereRaw
      .filter((e) => e.canalFinancement === CanalFinancement.OPCO)
      .reduce((sum, e) => sum + (e.valeurEstimee ?? 0) * (e.probabilite ?? 0.5), 0);

    // Activités par semaine
    const weeksAgo = (n: number) => new Date(Date.now() - n * 7 * 86400000);
    const weekBuckets = [3, 2, 1, 0].map((ago) => {
      const start = weeksAgo(ago + 1);
      const end = weeksAgo(ago);
      return {
        label: `S-${ago + 1}`,
        count: activitesByWeek.filter((a) => a.createdAt >= start && a.createdAt < end).length,
      };
    });

    const tauxReponse = emailsEnvoyes > 0 ? Math.round((reponses / emailsEnvoyes) * 100) : 0;
    const contacteCount = statutCounts["Contacte"] ?? 0;
    const rdvCount = statutCounts["RDV"] ?? 0;
    const gagne = statutCounts["Gagne"] ?? 0;
    const tauxRdv = contacteCount > 0 ? Math.round((rdvCount / contacteCount) * 100) : 0;
    const tauxTransfo = rdvCount > 0 ? Math.round((gagne / rdvCount) * 100) : 0;

    return {
      totalEtablissements,
      totalPipeline,
      statutCounts,
      caGagne: caGagneRaw._sum.valeurEstimee ?? 0,
      caPondere,
      caPondereFormiris,
      caPondereOpco,
      weekBuckets,
      tauxReponse,
      tauxRdv,
      tauxTransfo,
      emailsEnvoyes,
      reponses,
    };
  }),

  // Déplacer une carte dans le kanban
  move: publicProcedure
    .input(z.object({
      etablissementId: z.string(),
      statut: z.nativeEnum(StatutPipeline),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pipelineEntry.upsert({
        where: { etablissementId: input.etablissementId },
        create: { etablissementId: input.etablissementId, statut: input.statut },
        update: { statut: input.statut, movedAt: new Date() },
      });
    }),
});
