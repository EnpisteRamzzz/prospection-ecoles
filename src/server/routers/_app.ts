import { router } from "@/lib/trpc/server";
import { etablissementRouter } from "./etablissement";
import { templateRouter } from "./template";
import { activiteRouter } from "./activite";
import { contactRouter } from "./contact";
import { sequenceRouter } from "./sequence";
import { pipelineRouter } from "./pipeline";
import { adminRouter } from "./admin";

export const appRouter = router({
  etablissement: etablissementRouter,
  template: templateRouter,
  activite: activiteRouter,
  contact: contactRouter,
  sequence: sequenceRouter,
  pipeline: pipelineRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
