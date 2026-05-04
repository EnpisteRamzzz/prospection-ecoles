import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { geocodeEtablissements } from "@/lib/inngest/geocode";
import { sequenceStepRunner } from "@/lib/inngest/sequence";
import { scrapeEtablissements } from "@/lib/inngest/scrape";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [geocodeEtablissements, sequenceStepRunner, scrapeEtablissements],
});
