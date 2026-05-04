"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mustache from "mustache";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmailComposerProps {
  etablissement: {
    uai: string;
    nomEtablissement: string;
    ville: string | null;
    type: string;
    statutContrat: string;
    publicFormiris: boolean;
    publicOpco: boolean;
    formationsProposables: string[];
  };
  contacts: Array<{
    id: string;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    fonction: string | null;
  }>;
  onClose: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function EmailComposer({ etablissement, contacts, onClose }: EmailComposerProps) {
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [objet, setObjet] = useState("");

  const { data: templates = [] } = trpc.template.list.useQuery();

  const logEmail = trpc.activite.logEmail.useMutation({
    onSuccess() {
      toast.success("Email simulé et enregistré");
      onClose();
    },
    onError(err) {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Rédigez votre email ici…",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] focus:outline-none px-3 py-2",
      },
    },
  });

  const handleApplyTemplate = useCallback(() => {
    if (!selectedTemplateSlug || !editor) return;

    const template = templates.find((t) => t.slug === selectedTemplateSlug);
    if (!template) return;

    const contact = contacts.find((c) => c.id === selectedContactId);

    const statutContratLabel =
      etablissement.statutContrat === "SousContrat" ? "sous contrat" : "hors contrat";

    const view = {
      prenom: contact?.prenom ?? "Madame/Monsieur",
      nom: contact?.nom ?? "",
      etablissement: etablissement.nomEtablissement,
      ville: etablissement.ville ?? "",
      type: etablissement.type,
      statut_contrat: statutContratLabel,
      formations: etablissement.formationsProposables.join(", "),
    };

    if (template.objet) {
      setObjet(Mustache.render(template.objet, view));
    }

    const renderedBody = Mustache.render(template.contenu, view);
    editor.commands.setContent(renderedBody);
  }, [selectedTemplateSlug, selectedContactId, templates, contacts, etablissement, editor]);

  function handleSimulerEnvoi() {
    if (!editor) return;
    if (!objet.trim()) {
      toast.error("Veuillez renseigner un objet");
      return;
    }

    const contenuHtml = editor.getHTML();

    logEmail.mutate({
      etablissementId: etablissement.uai,
      contactId: selectedContactId || undefined,
      templateSlug: selectedTemplateSlug || undefined,
      objet,
      contenu: contenuHtml,
      destinataire: contacts.find((c) => c.id === selectedContactId)?.email ?? undefined,
    });
  }

  return (
    <div className="space-y-4">
      {/* Sélection template */}
      <div className="space-y-1.5">
        <Label>Template</Label>
        <Select value={selectedTemplateSlug} onValueChange={(v) => setSelectedTemplateSlug(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un template…" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.nom}
                {t.pitchType ? ` — ${t.pitchType}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sélection contact */}
      <div className="space-y-1.5">
        <Label>Contact</Label>
        <Select value={selectedContactId} onValueChange={(v) => setSelectedContactId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Aucun contact sélectionné" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Aucun contact</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {[c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom"}
                {c.fonction ? ` — ${c.fonction}` : ""}
                {c.email ? ` (${c.email})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bouton appliquer template */}
      {selectedTemplateSlug && (
        <button
          type="button"
          onClick={handleApplyTemplate}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Appliquer le template
        </button>
      )}

      {/* Objet */}
      <div className="space-y-1.5">
        <Label htmlFor="email-objet">Objet</Label>
        <Input
          id="email-objet"
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          placeholder="Objet de l'email…"
        />
      </div>

      {/* Éditeur Tiptap */}
      <div className="space-y-1.5">
        <Label>Corps du message</Label>
        <div className="rounded-md border bg-background min-h-[220px] focus-within:ring-2 focus-within:ring-ring">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Annuler
        </button>
        <Button
          onClick={handleSimulerEnvoi}
          disabled={logEmail.isPending}
        >
          {logEmail.isPending ? "Simulation…" : "Simuler l'envoi"}
        </Button>
      </div>

      {/* Mention RGPD */}
      <p className="text-xs text-zinc-400">
        Conformément au RGPD, cet email est envoyé dans un cadre BtoB professionnel. Vous disposez d&apos;un droit d&apos;opposition.
      </p>
    </div>
  );
}
