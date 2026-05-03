import { router } from "@/lib/trpc/server";
import { etablissementRouter } from "./etablissement";

export const appRouter = router({
  etablissement: etablissementRouter,
});

export type AppRouter = typeof appRouter;
