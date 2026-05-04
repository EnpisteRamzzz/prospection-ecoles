import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";
import { TypeActivite, CanalActivite } from "@/generated/prisma/client";

export const activiteRouter = router({
  list: publicProcedure
    .input(
      z.object({
        etablissementId: z.string(),
        contactId: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { etablissementId, contactId, page, pageSize } = input;
      const where = {
        etablissementId,
        ...(contactId ? { contactId } : {}),
      };

      const [total, items] = await Promise.all([
        ctx.prisma.activite.count({ where }),
        ctx.prisma.activite.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            contact: { select: { id: true, prenom: true, nom: true } },
          },
        }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        etablissementId: z.string(),
        contactId: z.string().optional(),
        type: z.nativeEnum(TypeActivite),
        canal: z.nativeEnum(CanalActivite).optional(),
        objet: z.string().optional(),
        contenu: z.string().optional(),
        statut: z.string().optional(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.activite.create({
        data: input,
      });
    }),

  logEmail: publicProcedure
    .input(
      z.object({
        etablissementId: z.string(),
        contactId: z.string().optional(),
        templateSlug: z.string().optional(),
        objet: z.string(),
        contenu: z.string(),
        destinataire: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.activite.create({
        data: {
          etablissementId: input.etablissementId,
          contactId: input.contactId,
          type: TypeActivite.email,
          canal: CanalActivite.email,
          objet: input.objet,
          contenu: input.contenu,
          statut: "simule",
        },
      });
    }),
});
