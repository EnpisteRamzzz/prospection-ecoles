import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Reproduit la logique de parsing du routeur tRPC sans dépendance DB
// (test unitaire de la couche parsing uniquement)

type StatutContrat = "SousContrat" | "HorsContrat" | "Inconnu";

function parseStatutContrat(raw: string): StatutContrat {
  const normalized = raw.trim();
  if (normalized === "Sous contrat") return "SousContrat";
  if (normalized === "Hors contrat") return "HorsContrat";
  return "Inconnu";
}

function parseCsvLine(line: string): string[] {
  return line.split(";").map((v) => v.trim());
}

function parseCsv(content: string) {
  const raw = content.replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCsvLine(lines[0]);

  const idxStatut = header.indexOf("statut_contrat");
  const idxUai = header.indexOf("UAI");

  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      uai: cols[idxUai] ?? "",
      statutContrat: parseStatutContrat(cols[idxStatut] ?? ""),
    };
  });

  return { header, rows };
}

const CSV_PATH = join(
  process.cwd(),
  "context/ecoles_privees_IDF_GrandEst_2026.csv"
);

describe("Import CSV — parsing", () => {
  it("le fichier CSV existe dans context/", () => {
    expect(() => readFileSync(CSV_PATH)).not.toThrow();
  });

  it("contient exactement 1888 lignes de données", () => {
    const content = readFileSync(CSV_PATH, "utf-8");
    const { rows } = parseCsv(content);
    expect(rows.length).toBe(1888);
  });

  it("répartition statuts_contrat : 1191 SC / 684 HC / 13 inconnu", () => {
    const content = readFileSync(CSV_PATH, "utf-8");
    const { rows } = parseCsv(content);

    const counts = rows.reduce(
      (acc, r) => {
        acc[r.statutContrat] = (acc[r.statutContrat] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    expect(counts.SousContrat).toBe(1191);
    expect(counts.HorsContrat).toBe(684);
    expect(counts.Inconnu).toBe(13);
  });

  it("tous les UAI sont non vides (1879 uniques — 7 doublons attendus pour ensembles scolaires multi-niveaux)", () => {
    const content = readFileSync(CSV_PATH, "utf-8");
    const { rows } = parseCsv(content);

    const uais = rows.map((r) => r.uai).filter((u) => u.length > 0);
    const unique = new Set(uais);

    // 1888 lignes au total, dont 9 doublons (7 UAI apparaissent 2 ou 3 fois)
    // → upsert par UAI donnera 1879 établissements en base
    expect(uais.length).toBe(1888);
    expect(unique.size).toBe(1879);
  });

  it("parse 1888 lignes en moins de 30 secondes", { timeout: 30_000 }, () => {
    const content = readFileSync(CSV_PATH, "utf-8");
    const start = Date.now();
    const { rows } = parseCsv(content);
    const elapsed = Date.now() - start;

    expect(rows.length).toBe(1888);
    expect(elapsed).toBeLessThan(30_000);
    console.log(`  ✓ Parsing en ${elapsed} ms`);
  });
});
