import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc/server";
import { StatutContrat } from "@/generated/prisma/client";

// Mapping du CSV vers l'enum Prisma StatutContrat
function parseStatutContrat(raw: string): StatutContrat {
  const normalized = raw.trim();
  if (normalized === "Sous contrat") return StatutContrat.SousContrat;
  if (normalized === "Hors contrat") return StatutContrat.HorsContrat;
  return StatutContrat.Inconnu;
}

// Dérive les canaux de financement et formations proposables selon le statut
function derivePublics(statut: StatutContrat): {
  publicFormiris: boolean;
  publicOpco: boolean;
  formationsProposables: string[];
} {
  if (statut === StatutContrat.SousContrat) {
    return {
      publicFormiris: true,
      publicOpco: true,
      formationsProposables: [
        "ia-pratique-enseignante",
        "genially-enseigner",
        "ia-genially-sequence",
        "ia-admin-direction",
        "genially-communication",
        "pack-productivite-ia",
      ],
    };
  }
  if (statut === StatutContrat.HorsContrat) {
    return {
      publicFormiris: false,
      publicOpco: true,
      // Hors contrat : tout le personnel finançable OPCO — toutes les formations
      formationsProposables: [
        "ia-pratique-enseignante",
        "genially-enseigner",
        "ia-genially-sequence",
        "ia-admin-direction",
        "genially-communication",
        "pack-productivite-ia",
      ],
    };
  }
  return { publicFormiris: false, publicOpco: false, formationsProposables: [] };
}

// Parse le CSV séparateur ";" encodage UTF-8 BOM
function parseCsvLine(line: string): string[] {
  return line.split(";").map((v) => v.trim());
}

export const etablissementRouter = router({
  importCsv: publicProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Retire le BOM UTF-8 éventuel
      const raw = input.content.replace(/^﻿/, "");
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length < 2) {
        throw new Error("CSV vide ou sans données");
      }

      const header = parseCsvLine(lines[0]);
      // Colonnes attendues
      const idx = {
        uai: header.indexOf("UAI"),
        nom: header.indexOf("nom_etablissement"),
        type: header.indexOf("type"),
        nature: header.indexOf("nature"),
        typeContratBrut: header.indexOf("type_contrat_brut"),
        statutContrat: header.indexOf("statut_contrat"),
        adresse: header.indexOf("adresse"),
        codePostal: header.indexOf("code_postal"),
        ville: header.indexOf("ville"),
        codeDept: header.indexOf("code_dept"),
        departement: header.indexOf("departement"),
        region: header.indexOf("region"),
        telephone: header.indexOf("telephone"),
        email: header.indexOf("email"),
        siteWeb: header.indexOf("site_web"),
        siret: header.indexOf("siret"),
        opcoProb: header.indexOf("OPCO_probable"),
        contactDecisionnaire: header.indexOf("contact_decisionnaire"),
        fonctionContact: header.indexOf("fonction_contact"),
        profil: header.indexOf("profil_pedagogique_notes"),
        etat: header.indexOf("etat"),
      };

      if (idx.uai === -1) throw new Error("Colonne UAI introuvable");

      const dataLines = lines.slice(1);
      let added = 0;
      let updated = 0;
      const errors: string[] = [];

      // Upsert par batch de 100 pour les performances
      const BATCH = 100;
      for (let i = 0; i < dataLines.length; i += BATCH) {
        const batch = dataLines.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (line, batchIdx) => {
            const cols = parseCsvLine(line);
            const uai = cols[idx.uai];
            if (!uai) {
              errors.push(`Ligne ${i + batchIdx + 2} : UAI manquant`);
              return;
            }

            const statutRaw = idx.statutContrat !== -1 ? cols[idx.statutContrat] : "";
            const statut = parseStatutContrat(statutRaw);
            const { publicFormiris, publicOpco, formationsProposables } =
              derivePublics(statut);

            const data = {
              nomEtablissement: cols[idx.nom] ?? "",
              type: cols[idx.type] ?? "",
              nature: cols[idx.nature] || null,
              typeContratBrut: cols[idx.typeContratBrut] || null,
              statutContrat: statut,
              adresse: cols[idx.adresse] || null,
              codePostal: cols[idx.codePostal] || null,
              ville: cols[idx.ville] || null,
              codeDept: cols[idx.codeDept] || null,
              departement: cols[idx.departement] || null,
              region: cols[idx.region] || null,
              telephone: cols[idx.telephone] || null,
              email: cols[idx.email] || null,
              siteWeb: cols[idx.siteWeb] || null,
              siret: cols[idx.siret] || null,
              opcoProb: cols[idx.opcoProb] || null,
              publicFormiris,
              publicOpco,
              formationsProposables,
              etat: cols[idx.etat] || "Ouvert",
            };

            const existing = await ctx.prisma.etablissement.findUnique({
              where: { uai },
              select: { uai: true },
            });

            if (existing) {
              // Upsert sans écraser les enrichissements manuels
              await ctx.prisma.etablissement.update({
                where: { uai },
                data: {
                  ...data,
                  // Ne pas écraser si déjà renseigné manuellement
                  contactDecisionnaire: undefined,
                  fonctionContact: undefined,
                  profilPedagogiqueNotes: undefined,
                },
              });
              updated++;
            } else {
              await ctx.prisma.etablissement.create({ data: { uai, ...data } });
              added++;
            }
          })
        );
      }

      return {
        total: dataLines.length,
        added,
        updated,
        errors: errors.slice(0, 20),
      };
    }),

  count: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.etablissement.count();
  }),

  countByStatut: publicProcedure.query(async ({ ctx }) => {
    const [sousContrat, horsContrat, inconnu] = await Promise.all([
      ctx.prisma.etablissement.count({
        where: { statutContrat: StatutContrat.SousContrat },
      }),
      ctx.prisma.etablissement.count({
        where: { statutContrat: StatutContrat.HorsContrat },
      }),
      ctx.prisma.etablissement.count({
        where: { statutContrat: StatutContrat.Inconnu },
      }),
    ]);
    return { sousContrat, horsContrat, inconnu };
  }),
});
