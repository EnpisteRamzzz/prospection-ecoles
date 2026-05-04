import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { parse } from "node-html-parser";

const UA = "ProspectionEcoles/1.0 (contact@votre-domaine.fr; scraping pédagogique BtoB)";
const DELAY_MS = 1000; // 1 req/sec — respectueux des serveurs
const PATHS_TO_TRY = ["/equipe", "/notre-equipe", "/contact", "/contacts", "/direction", "/qui-sommes-nous", "/a-propos"];

// ─── Robots.txt parser minimal ────────────────────────────────────────────────

async function isAllowedByRobots(baseUrl: string, path: string): Promise<boolean> {
  try {
    const url = new URL("/robots.txt", baseUrl).href;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return true; // pas de robots.txt = autorisé

    const text = await res.text();
    const lines = text.split(/\r?\n/);

    let relevant = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        const agent = trimmed.slice(11).trim();
        relevant = agent === "*" || agent.toLowerCase().includes("prospection");
      }
      if (relevant && trimmed.toLowerCase().startsWith("disallow:")) {
        const disallowed = trimmed.slice(9).trim();
        if (disallowed && path.startsWith(disallowed)) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

// ─── Extraction chef d'établissement ─────────────────────────────────────────

const FONCTIONS_KEYWORDS = [
  "chef d'établissement", "chef d'etablissement",
  "directeur", "directrice", "directeur général", "directrice générale",
  "principal", "proviseur", "proviseure",
  "responsable pédagogique", "direction",
];

interface ExtractedContact {
  prenom: string | null;
  nom: string;
  fonction: string | null;
  sourceUrl: string;
}

function extractContacts(html: string, pageUrl: string): ExtractedContact[] {
  const root = parse(html);
  const results: ExtractedContact[] = [];

  // Cherche les éléments qui contiennent une fonction pertinente
  const allText = root.querySelectorAll("p, li, div, span, h2, h3, h4, td");

  for (const el of allText) {
    const text = el.text.trim();
    const lower = text.toLowerCase();

    // Doit contenir un mot-clé de fonction
    const fonctionMatch = FONCTIONS_KEYWORDS.find((kw) => lower.includes(kw));
    if (!fonctionMatch) continue;

    // Longueur raisonnable (évite les blocs trop longs)
    if (text.length > 200 || text.length < 3) continue;

    // Cherche un nom propre dans le voisinage (parent ou siblings)
    const context = (el.parentNode?.text ?? text).slice(0, 300);

    // Pattern nom : 2 mots capitalisés consécutifs (prénom + nom)
    const namePattern = /\b([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ][a-zàâäéèêëîïôùûüç\-]+)\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ\-]+|[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ][a-zàâäéèêëîïôùûüç\-]+)\b/g;
    const nameMatches = [...context.matchAll(namePattern)];

    for (const match of nameMatches) {
      const full = match[0];
      // Filtre les faux positifs communs
      if (["Les", "Des", "Une", "Pour", "Nos", "Votre", "Notre"].includes(match[1])) continue;

      const parts = full.split(/\s+/);
      results.push({
        prenom: parts[0] ?? null,
        nom: parts.slice(1).join(" "),
        fonction: fonctionMatch,
        sourceUrl: pageUrl,
      });
    }
  }

  // Déduplique par nom
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.nom.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const scrapeEtablissements = inngest.createFunction(
  {
    id: "scrape-etablissements",
    concurrency: { limit: 1 },
    triggers: [{ event: "etablissement/scrape.requested" }],
  },
  async ({ event, step }) => {
    const limit = (event.data as { limit?: number })?.limit ?? 50;

    const toScrape = await step.run("find-to-scrape", () =>
      prisma.etablissement.findMany({
        where: {
          siteWeb: { not: null },
          contacts: { none: { source: "scraping" } },
        },
        select: { uai: true, nomEtablissement: true, siteWeb: true },
        take: limit,
      })
    );

    let scraped = 0;
    let found = 0;
    let skipped = 0;

    for (const etab of toScrape) {
      await step.run(`scrape-${etab.uai}`, async () => {
        const baseUrl = etab.siteWeb!;
        const contacts: ExtractedContact[] = [];

        for (const path of PATHS_TO_TRY) {
          try {
            const allowed = await isAllowedByRobots(baseUrl, path);
            if (!allowed) { skipped++; continue; }

            await new Promise((r) => setTimeout(r, DELAY_MS));

            const pageUrl = new URL(path, baseUrl).href;
            const res = await fetch(pageUrl, {
              headers: { "User-Agent": UA },
              signal: AbortSignal.timeout(8000),
              redirect: "follow",
            });

            if (!res.ok) continue;
            const ct = res.headers.get("content-type") ?? "";
            if (!ct.includes("text/html")) continue;

            const html = await res.text();
            const extracted = extractContacts(html, pageUrl);
            contacts.push(...extracted);

            if (contacts.length >= 3) break; // assez trouvé pour cet établissement
          } catch {
            // page inaccessible — on passe
          }
        }

        if (contacts.length > 0) {
          await prisma.contact.createMany({
            data: contacts.slice(0, 3).map((c) => ({
              etablissementId: etab.uai,
              prenom: c.prenom,
              nom: c.nom,
              fonction: c.fonction,
              source: "scraping",
              sourceUrl: c.sourceUrl,
            })),
            skipDuplicates: true,
          });
          found += contacts.length;
        }

        scraped++;
      });
    }

    return { total: toScrape.length, scraped, found, skipped };
  }
);
