import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";
import { ContactSource } from "@/generated/prisma/client";

export const contactRouter = router({
  list: publicProcedure
    .input(z.object({ etablissementId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.contact.findMany({
        where: { etablissementId: input.etablissementId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        etablissementId: z.string(),
        prenom: z.string().optional(),
        nom: z.string().optional(),
        fonction: z.string().optional(),
        email: z.string().optional(),
        telephone: z.string().optional(),
        linkedin: z.string().optional(),
        source: z.nativeEnum(ContactSource),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contact.create({
        data: input,
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        prenom: z.string().optional(),
        nom: z.string().optional(),
        fonction: z.string().optional(),
        email: z.string().optional(),
        telephone: z.string().optional(),
        linkedin: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.contact.update({
        where: { id },
        data,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contact.delete({
        where: { id: input.id },
      });
    }),
});
