import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";
import { inngest } from "@/lib/inngest/client";

export const adminRouter = router({
  // Lance le scraping en background
  triggerScrape: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .mutation(async ({ input }) => {
      await inngest.send({
        name: "etablissement/scrape.requested",
        data: { limit: input.limit },
      });
      return { ok: true };
    }),

  // Lance le géocodage
  triggerGeocode: publicProcedure
    .mutation(async () => {
      await inngest.send({ name: "etablissement/geocode.requested", data: {} });
      return { ok: true };
    }),

  // Stats pour la page paramètres
  stats: publicProcedure.query(async ({ ctx }) => {
    const [totalEtab, totalContacts, contactsScraping, contactsManuels, avecSiteWeb, geocodés] = await Promise.all([
      ctx.prisma.etablissement.count(),
      ctx.prisma.contact.count(),
      ctx.prisma.contact.count({ where: { source: "scraping" } }),
      ctx.prisma.contact.count({ where: { source: "manual" } }),
      ctx.prisma.etablissement.count({ where: { siteWeb: { not: null } } }),
      ctx.prisma.etablissement.count({ where: { latitude: { not: null } } }),
    ]);
    return { totalEtab, totalContacts, contactsScraping, contactsManuels, avecSiteWeb, geocodés };
  }),

  // Export JSON (établissements + contacts)
  exportData: publicProcedure
    .input(z.object({ type: z.enum(["etablissements", "contacts", "activites"]) }))
    .query(async ({ ctx, input }) => {
      if (input.type === "etablissements") {
        return ctx.prisma.etablissement.findMany({ orderBy: { nomEtablissement: "asc" } });
      }
      if (input.type === "contacts") {
        return ctx.prisma.contact.findMany({ include: { etablissement: { select: { nomEtablissement: true, uai: true } } }, orderBy: { createdAt: "desc" } });
      }
      return ctx.prisma.activite.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    }),

  // Suppression d'un contact (droit à l'effacement RGPD)
  deleteContact: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.contact.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  // Suppression de tous les contacts scraping d'un établissement
  deleteScrapingContacts: publicProcedure
    .input(z.object({ etablissementId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.prisma.contact.deleteMany({
        where: { etablissementId: input.etablissementId, source: "scraping" },
      });
      return { deleted: count };
    }),

  // Reset complet des contacts scraping
  resetAllScrapingContacts: publicProcedure
    .mutation(async ({ ctx }) => {
      const { count } = await ctx.prisma.contact.deleteMany({ where: { source: "scraping" } });
      return { deleted: count };
    }),
});
