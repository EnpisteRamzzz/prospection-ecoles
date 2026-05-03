"use client";

import { useCallback, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ImportResult = {
  total: number;
  added: number;
  updated: number;
  errors: string[];
};

export function ImportCsvClient() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const importMutation = trpc.etablissement.importCsv.useMutation({
    onSuccess(data) {
      setResult(data);
      setProgress(100);
    },
    onError(err) {
      setImportError(err.message);
      setProgress(0);
    },
  });

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setImportError("Veuillez sélectionner un fichier .csv");
        return;
      }
      setFileName(file.name);
      setResult(null);
      setImportError(null);
      setProgress(10);

      const content = await file.text();
      setProgress(30);
      importMutation.mutate({ content });
    },
    [importMutation]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const isLoading = importMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors select-none",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-zinc-300 hover:border-zinc-400 bg-white",
          isLoading ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex flex-col items-center gap-3">
          <svg
            className="w-10 h-10 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 8h6m-5 0a3 3 0 110 6H9l3 6m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {fileName ? (
            <p className="text-sm font-medium text-zinc-700">{fileName}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700">
                Glissez votre fichier CSV ici
              </p>
              <p className="text-xs text-zinc-400">ou cliquez pour parcourir</p>
            </>
          )}
        </div>
      </div>

      {/* Bouton import */}
      {fileName && !result && (
        <Button
          onClick={() => {
            if (inputRef.current?.files?.[0]) {
              handleFile(inputRef.current.files[0]);
            }
          }}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Import en cours…" : "Importer"}
        </Button>
      )}

      {/* Barre de progression */}
      {isLoading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-zinc-500 text-center">
            Traitement en cours — cela peut prendre quelques secondes…
          </p>
        </div>
      )}

      {/* Erreur */}
      {importError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 font-medium">Erreur d&apos;import</p>
          <p className="text-xs text-red-600 mt-1">{importError}</p>
        </Card>
      )}

      {/* Résultat */}
      {result && (
        <Card className="p-6 border-green-200 bg-green-50 space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-semibold text-green-800">Import terminé</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-800">{result.total}</p>
              <p className="text-xs text-zinc-500">Lignes traitées</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{result.added}</p>
              <p className="text-xs text-zinc-500">Ajoutés</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
              <p className="text-xs text-zinc-500">Mis à jour</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-700">
                {result.errors.length} avertissement(s) :
              </p>
              {result.errors.map((e, i) => (
                <Badge key={i} variant="outline" className="text-xs text-amber-600 border-amber-300">
                  {e}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
