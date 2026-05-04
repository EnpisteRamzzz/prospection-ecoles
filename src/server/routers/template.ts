import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";

export const templateRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.template.findMany({
      where: { actif: true },
      select: {
        id: true,
        slug: true,
        nom: true,
        canal: true,
        pitchType: true,
        objet: true,
        contenu: true,
        variables: true,
      },
      orderBy: { nom: "asc" },
    });
  }),

  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.template.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          slug: true,
          nom: true,
          canal: true,
          pitchType: true,
          objet: true,
          contenu: true,
          variables: true,
        },
      });
    }),
});
