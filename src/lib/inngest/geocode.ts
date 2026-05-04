import { inngest } from "./client";
import { prisma } from "@/lib/prisma";

const BAN_API = "https://api-adresse.data.gouv.fr/search/";
const DELAY_MS = 300; // délai entre requêtes BAN — API publique, 50 req/s max

// Worker géocodage via l'API adresse.data.gouv.fr (BAN officielle, RGPD OK, gratuite)
export const geocodeEtablissements = inngest.createFunction(
  {
    id: "geocode-etablissements",
    concurrency: { limit: 1 },
    triggers: [{ event: "etablissement/geocode.requested" }],
  },
  async ({ step }) => {
    const toGeocode = await step.run("find-ungeocodized", async () => {
      return prisma.etablissement.findMany({
        where: { latitude: null, siteWeb: { not: null } },
        select: { uai: true, adresse: true, codePostal: true, ville: true },
        take: 200,
      });
    });

    let geocoded = 0;
    let failed = 0;

    for (const etab of toGeocode) {
      const query = [etab.adresse, etab.codePostal, etab.ville]
        .filter(Boolean)
        .join(" ");

      await step.run(`geocode-${etab.uai}`, async () => {
        try {
          const url = `${BAN_API}?q=${encodeURIComponent(query)}&limit=1`;
          const res = await fetch(url, {
            headers: { "User-Agent": "prospection-ecoles/1.0" },
          });
          if (!res.ok) { failed++; return; }

          const data = (await res.json()) as {
            features?: Array<{ geometry: { coordinates: [number, number] } }>;
          };
          const feature = data.features?.[0];
          if (!feature) { failed++; return; }

          const [lng, lat] = feature.geometry.coordinates;
          await prisma.etablissement.update({
            where: { uai: etab.uai },
            data: { latitude: lat, longitude: lng, geocodedAt: new Date() },
          });
          geocoded++;
        } catch {
          failed++;
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      });
    }

    return { total: toGeocode.length, geocoded, failed };
  }
);
