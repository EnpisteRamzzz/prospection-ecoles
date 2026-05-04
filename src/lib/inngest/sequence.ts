import { inngest } from "./client";
import { prisma } from "@/lib/prisma";

export const sequenceStepRunner = inngest.createFunction(
  { id: "sequence-step-runner", triggers: [{ event: "sequence/step.due" }] },
  async ({ event, step }) => {
    const { enrollmentId, stepIndex } = event.data as {
      enrollmentId: string;
      stepIndex: number;
    };

    // 1. Charger l'enrollment + sequence + etablissement
    const enrollment = await step.run("load-enrollment", () =>
      prisma.sequenceEnrollment.findUnique({
        where: { id: enrollmentId },
        include: { sequence: true, etablissement: true, contact: true },
      })
    );

    // 2. Si exited/paused/completed → stop
    if (!enrollment || enrollment.statut !== "active") return { skipped: true };

    // 3. Charger le step
    const steps = enrollment.sequence.steps as Array<{
      jour: number;
      canal: string;
      templateSlug: string;
      description?: string;
    }>;
    const currentStep = steps[stepIndex];
    if (!currentStep) return { done: true };

    // 4. Créer l'activité (simulation)
    await step.run("log-activity", () =>
      prisma.activite.create({
        data: {
          etablissementId: enrollment.etablissementId,
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId,
          enrollmentId: enrollment.id,
          type:
            currentStep.canal === "email"
              ? "email"
              : currentStep.canal === "linkedin"
                ? "linkedin"
                : "appel",
          canal:
            currentStep.canal === "email"
              ? "email"
              : currentStep.canal === "linkedin"
                ? "linkedin"
                : currentStep.canal === "appel"
                  ? "telephone"
                  : undefined,
          objet: `[Séquence ${enrollment.sequence.nom}] Étape J+${currentStep.jour}`,
          contenu: `Step automatique — template: ${currentStep.templateSlug}`,
          statut: "simule",
          executedAt: new Date(),
        },
      })
    );

    // 5. Avancer le currentStep
    const nextStepIndex = stepIndex + 1;
    await step.run("advance-step", () =>
      prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: nextStepIndex },
      })
    );

    // 6. Si étape suivante existe → programmer l'event pour dans X jours
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];
      const daysUntilNext = nextStep.jour - currentStep.jour;
      await step.sendEvent("schedule-next", {
        name: "sequence/step.due",
        data: { enrollmentId, stepIndex: nextStepIndex },
        // En dev, on schedule immédiatement (pas de délai réel)
        // En prod, utiliser: ts: new Date(Date.now() + daysUntilNext * 86400000)
      });
      return { executed: stepIndex, next: nextStepIndex, daysUntilNext };
    }

    // 7. Séquence terminée
    await step.run("complete-enrollment", () =>
      prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { statut: "completed", completedAt: new Date(), exitReason: "completed" },
      })
    );
    return { completed: true };
  }
);
