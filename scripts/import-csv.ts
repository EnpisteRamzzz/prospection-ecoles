import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { StatutContrat } from "@/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function parseStatutContrat(raw: string): StatutContrat {
  const v = raw.trim();
  if (v === "Sous contrat") return StatutContrat.SousContrat;
  if (v === "Hors contrat") return StatutContrat.HorsContrat;
  return StatutContrat.Inconnu;
}

function derivePublics(statut: StatutContrat) {
  const all = [
    "ia-pratique-enseignante", "genially-enseigner", "ia-genially-sequence",
    "ia-admin-direction", "genially-communication", "pack-productivite-ia",
  ];
  if (statut === StatutContrat.SousContrat) return { publicFormiris: true, publicOpco: true, formationsProposables: all };
  if (statut === StatutContrat.HorsContrat) return { publicFormiris: false, publicOpco: true, formationsProposables: all };
  return { publicFormiris: false, publicOpco: false, formationsProposables: [] };
}

function parseCsvLine(line: string): string[] {
  return line.split(";").map((v) => v.trim());
}

async function main() {
  const csvPath = resolve("context/ecoles_privees_IDF_GrandEst_2026.csv");
  const raw = readFileSync(csvPath, "utf-8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
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
    etat: header.indexOf("etat"),
  };

  if (idx.uai === -1) throw new Error("Colonne UAI introuvable");

  const dataLines = lines.slice(1);
  let added = 0, updated = 0;
  const errors: string[] = [];
  const seen = new Set<string>();

  const BATCH = 50;
  for (let i = 0; i < dataLines.length; i += BATCH) {
    const batch = dataLines.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (line, batchIdx) => {
        const cols = parseCsvLine(line);
        const uai = cols[idx.uai];
        if (!uai) { errors.push(`Ligne ${i + batchIdx + 2}: UAI manquant`); return; }

        const statut = parseStatutContrat(cols[idx.statutContrat] ?? "");
        const { publicFormiris, publicOpco, formationsProposables } = derivePublics(statut);
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

        const isNew = !seen.has(uai);
        seen.add(uai);

        try {
          await prisma.etablissement.upsert({ where: { uai }, create: { uai, ...data }, update: data });
          if (isNew) added++; else updated++;
        } catch (e) {
          errors.push(`UAI ${uai}: ${e instanceof Error ? e.message : String(e)}`);
        }
      })
    );
    if ((i / BATCH) % 4 === 0) process.stdout.write(`\r  ${Math.min(i + BATCH, dataLines.length)}/${dataLines.length} lignes...`);
  }

  console.log(`\nImporté: ${added} ajoutés, ${updated} mis à jour, ${errors.length} erreurs`);
  if (errors.length > 0) console.log("Erreurs:", errors.slice(0, 10));

  const total = await prisma.etablissement.count();
  console.log(`Total en base: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
