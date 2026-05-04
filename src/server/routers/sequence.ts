import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";
import { inngest } from "@/lib/inngest/client";
import { TRPCError } from "@trpc/server";

export const sequenceRouter = router({
  // Liste toutes les séquences actives avec count d'enrollments
  list: publicProcedure.query(async ({ ctx }) => {
    const sequences = await ctx.prisma.sequence.findMany({
      where: { actif: true },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { statut: "active" },
            },
          },
        },
      },
    });
    return sequences;
  }),

  // Détail d'une séquence avec ses steps
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sequence = await ctx.prisma.sequence.findUnique({
        where: { id: input.id },
        include: {
          enrollments: {
            where: { statut: "active" },
            include: {
              etablissement: {
                select: { nomEtablissement: true, ville: true },
              },
              contact: {
                select: { prenom: true, nom: true },
              },
            },
          },
        },
      });
      if (!sequence) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Séquence introuvable" });
      }
      return sequence;
    }),

  // Inscrire un établissement à une séquence
  enroll: publicProcedure
    .input(
      z.object({
        etablissementId: z.string(),
        sequenceId: z.string(),
        contactId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifie si un enrollment actif existe déjà
      const existing = await ctx.prisma.sequenceEnrollment.findFirst({
        where: {
          etablissementId: input.etablissementId,
          sequenceId: input.sequenceId,
          statut: "active",
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cet établissement est déjà inscrit à cette séquence",
        });
      }

      // Crée l'enrollment
      const enrollment = await ctx.prisma.sequenceEnrollment.create({
        data: {
          etablissementId: input.etablissementId,
          sequenceId: input.sequenceId,
          contactId: input.contactId,
          statut: "active",
          currentStep: 0,
        },
      });

      // Émet l'event Inngest pour déclencher le premier step
      await inngest.send({
        name: "sequence/step.due",
        data: { enrollmentId: enrollment.id, stepIndex: 0 },
      });

      return enrollment;
    }),

  // Mettre en pause un enrollment
  pauseEnrollment: publicProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.sequenceEnrollment.update({
        where: { id: input.enrollmentId },
        data: { statut: "paused", pausedAt: new Date() },
      });
    }),

  // Sortir un enrollment de la séquence
  exitEnrollment: publicProcedure
    .input(
      z.object({
        enrollmentId: z.string(),
        exitReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.sequenceEnrollment.update({
        where: { id: input.enrollmentId },
        data: {
          statut: "exited",
          exitReason: input.exitReason,
          completedAt: new Date(),
        },
      });
    }),

  // Actions du jour : enrollments actifs dont le prochain step est dû aujourd'hui
  todayActions: publicProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const enrollments = await ctx.prisma.sequenceEnrollment.findMany({
      where: { statut: "active" },
      include: {
        etablissement: {
          select: {
            uai: true,
            nomEtablissement: true,
            ville: true,
            email: true,
          },
        },
        contact: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
          },
        },
        sequence: {
          select: {
            id: true,
            nom: true,
            steps: true,
          },
        },
      },
    });

    // Filtrer les enrollments dont le step courant est dû aujourd'hui ou avant
    const dueActions = enrollments.filter((enrollment) => {
      const steps = enrollment.sequence.steps as Array<{
        jour: number;
        canal: string;
        templateSlug: string;
        description?: string;
      }>;

      const currentStepData = steps[enrollment.currentStep];
      if (!currentStepData) return false;

      const dueDate = new Date(enrollment.startedAt);
      dueDate.setDate(dueDate.getDate() + currentStepData.jour);
      dueDate.setHours(23, 59, 59, 999);

      return dueDate <= today;
    });

    return dueActions;
  }),
});
