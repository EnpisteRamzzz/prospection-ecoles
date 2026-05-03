import { ImportCsvClient } from "./import-csv-client";

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
          Import CSV — Établissements
        </h1>
        <p className="text-zinc-500 mb-8 text-sm">
          Importez le fichier{" "}
          <code className="bg-zinc-100 px-1 rounded text-xs">
            ecoles_privees_IDF_GrandEst_2026.csv
          </code>{" "}
          (séparateur <code className="bg-zinc-100 px-1 rounded text-xs">;</code>, UTF-8 BOM).
          Les données existantes sont mises à jour par UAI sans écraser les enrichissements manuels.
        </p>
        <ImportCsvClient />
      </div>
    </main>
  );
}
