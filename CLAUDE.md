# CLAUDE.md — App de prospection écoles privées

## Contexte métier

Application de prospection commerciale B2B pour un consultant-formateur indépendant, OF certifié
**Qualiopi catégorie « Actions de formation »** (catégorie 1). Vend 6 formations non-certifiantes
sur **Genially** et **IA générative** à 1 888 écoles privées en Île-de-France et Grand Est.

### Double canal de financement (cœur de la stratégie)

| Statut école | Public visé | Canal financement | Formations |
|---|---|---|---|
| **Sous contrat** (1 191) | Enseignants | **Formiris** | IA pour enseigner, Genially pour enseigner, IA+Genially A→Z |
| **Sous contrat** (1 191) | Admin / direction | **OPCO AKTO** — CCN EPNL IDCC 3218 | IA admin, Genially communication, Pack productivité |
| **Hors contrat** (684) | Tout le personnel | **OPCO** (souvent AKTO) | Combinaison libre des 6 modules en intra |

→ Sur chaque école sous contrat : double pitch possible = Formiris (enseignants) + OPCO (admin).

### Catalogue (6 formations)

**Formiris** : L'IA au service de la pratique enseignante (14h) · Genially pour enseigner (14h)
· IA+Genially séquence A→Z (21h)

**OPCO AKTO** : L'IA pour le personnel admin et direction (14h) · Genially pour la communication
scolaire (7h) · Pack productivité IA vie scolaire (7h)

### Séquence multi-touch (21 jours)

J0 email → J+3 LinkedIn → J+7 relance email → J+14 appel → J+21 stop/nurture

Fenêtre prioritaire : **mai–juillet** (plans de formation 2026-2027 en construction).

---

## Stack technique

```
Frontend  : Next.js 15 (App Router) + TypeScript strict + Tailwind 4 + shadcn/ui
State     : TanStack Query (server state) + TanStack Table (tableaux)
API       : routes API Next.js + tRPC + Zod (validation)
ORM       : Prisma 7 (schema.prisma + prisma.config.ts)
DB        : PostgreSQL — Supabase cloud OU Docker local
Auth      : NextAuth v5 beta — magic link via Resend (V1 = magic link seul)
Email app : Resend (transactionnel app)
Email pro : simulation console/DB en V1, SMTP utilisateur en V1.5
Workers   : Inngest (séquences multi-touch, scraping, géocodage)
Carto     : MapLibre GL + tuiles OSM
Tests     : Vitest (unit/integration) + Playwright (e2e)
CI        : GitHub Actions
Deploy    : Vercel + Supabase ET docker-compose
```

### Pourquoi Inngest (et pas BullMQ)

Inngest supprime Redis comme dépendance dev, s'intègre nativement dans Next.js App Router
via un route handler, offre un dashboard de debug cloud, et couvre largement le volume
(< 1 888 séquences actives). BullMQ sera envisagé uniquement en cas de contrainte self-host forte.

---

## Commandes principales

```bash
pnpm dev              # serveur de dev (http://localhost:3000)
pnpm build            # build de production
pnpm typecheck        # vérification TypeScript (tsc --noEmit)
pnpm lint             # ESLint
pnpm test             # tests Vitest (run once)
pnpm test:watch       # tests Vitest en watch mode
pnpm test:e2e         # tests Playwright
pnpm db:generate      # prisma generate (regénère le client)
pnpm db:push          # prisma db push (sync schéma sans migration)
pnpm db:migrate       # prisma migrate dev (migration avec historique)
pnpm db:seed          # seed (tsx prisma/seed.ts)
pnpm db:studio        # Prisma Studio (interface visuelle DB)
```

---

## Structure des dossiers

```
src/
  app/                     # Routes Next.js App Router
    (auth)/                # Pages auth (login, magic-link)
    etablissements/        # Liste + fiche établissement
    import/                # Import CSV
    pipeline/              # Kanban prospection
    sequences/             # CRUD séquences
    aujourdhui/            # Actions du jour
    dashboard/             # Reporting
    parametres/            # Settings + RGPD
    api/                   # Route handlers (tRPC, Inngest, NextAuth)
  components/
    ui/                    # Composants shadcn/ui (ne pas modifier manuellement)
    [feature]/             # Composants métier par fonctionnalité
  lib/
    trpc/                  # Client et serveur tRPC
    prisma.ts              # Singleton client Prisma
    auth.ts                # Config NextAuth
    inngest/               # Client et fonctions Inngest
  server/
    routers/               # Routeurs tRPC (etablissement, contact, sequence…)
  generated/
    prisma/                # Client Prisma généré (gitignored)
prisma/
  schema.prisma            # Schéma de données
  migrations/              # Historique des migrations
  seed.ts                  # Seed : formations, templates, séquences
context/                   # Fichiers de référence métier (non compilés)
```

---

## Conventions de code

### TypeScript
- `strict: true` dans `tsconfig.json` — pas de `any`, pas de `as unknown as X`
- Types partagés dans `src/types/` ou co-localisés avec leur module
- Zod pour toute validation de données entrantes (API, CSV, formulaires)

### Naming
- Fichiers/dossiers : kebab-case (`etablissement-detail.tsx`)
- Composants React : PascalCase (`EtablissementDetail`)
- Variables/fonctions : camelCase (`publicFormiris`, `importCsv`)
- Constantes globales : SCREAMING_SNAKE_CASE (`MAX_BATCH_SIZE`)
- Colonnes DB Prisma : camelCase (mapped depuis snake_case CSV si besoin)

### Commits (Conventional Commits)
```
feat(import): parse CSV with BOM UTF-8
fix(pipeline): drag-drop optimistic update
chore(deps): bump prisma 7.x
test(import): add vitest for CSV uai count
docs(claude): update état actuel phase 1
```
Un commit = un changement cohérent. Jamais de commits fourre-tout.

### Commentaires
- En français si le commentaire porte du sens métier (Formiris, OPCO, IDCC, EPNL)
- Le code lui-même reste en anglais (variables, fonctions, types)
- Pas de commentaire si le nom de la variable/fonction est auto-explicatif

---

## Glossaire métier

| Terme | Définition |
|---|---|
| **UAI** | Unité Administrative Immatriculée — identifiant unique de chaque établissement scolaire (ex: 0750001A). Clé primaire du dataset. |
| **Formiris** | Organisme gérant la formation continue des **enseignants** des établissements privés **sous contrat** avec l'État. |
| **OPCO** | Opérateur de Compétences. Ici principalement **AKTO** pour les établissements relevant de la CCN EPNL. |
| **AKTO** | OPCO des secteurs du tertiaire (dont enseignement privé). Finance le PDC du **personnel non-enseignant**. |
| **CCN EPNL** | Convention Collective Nationale de l'Enseignement Privé Non Lucratif. |
| **IDCC 3218** | Identifiant de la CCN EPNL — permet de vérifier le rattachement OPCO via SIRET sur code-idcc.com ou cfadock.fr. |
| **EPNL** | Enseignement Privé Non Lucratif. |
| **Sous contrat** | École ayant passé un contrat avec l'État. Enseignants rémunérés par l'État. Formiris + OPCO disponibles. |
| **Hors contrat** | École sans contrat avec l'État (Montessori, alternatives, internationales…). Tout le personnel finançable OPCO. |
| **PDC** | Plan de Développement des Compétences — dispositif employeur de financement de la formation via OPCO. |
| **OGEC** | Organisme de Gestion de l'Enseignement Catholique — gère les aspects administratifs d'une école catholique sous contrat. |
| **Qualiopi** | Certification qualité des OF. Catégorie 1 = « Actions de formation ». Obligatoire pour financements publics/paritaires. |

---

## État actuel

### Phase 0 — Bootstrap (TERMINÉ ✓)
Next.js 15, shadcn/ui, Prisma 7 + adapter-pg, tRPC, TanStack, NextAuth v5, Inngest, Vitest, Playwright.

### Phase 1 — Modèle de données + import CSV (TERMINÉ ✓)

**Fait** :
- [x] Schéma Prisma 7 modèles (Etablissement, Contact, Activite, PipelineEntry, Template, Sequence, SequenceEnrollment)
- [x] Prisma 7 avec @prisma/adapter-pg (pattern adapter obligatoire en v7)
- [x] Seed : 6 templates (3 emails J0 + 2 LinkedIn + 1 relance) + 3 séquences × 5 étapes
- [x] tRPC router `etablissement.importCsv` : parse CSV `;` UTF-8 BOM, upsert par UAI
- [x] `derivePublics()` : calcule publicFormiris/publicOpco/formationsProposables selon statut
- [x] Page `/import` : drop-zone, barre de progression, résultat (ajoutés/mis à jour)
- [x] Vitest 5/5 ✓ : 1888 lignes / 1191 SC / 684 HC / 13 Inconnu / parsing < 30s

**Note CSV** : 7 UAI apparaissent 2 ou 3 fois (ensembles scolaires multi-niveaux)
→ 1888 lignes dans le CSV, 1879 établissements uniques en base après upsert.

**Décisions d'archi Phase 1** :
- Prisma 7 requiert `@prisma/adapter-pg` + `pg` (new PrismaClient({ adapter }))
- Import depuis `@/generated/prisma/client` (pas d'index.ts dans le dossier généré)
- formationsProposables derivées à l'import (non stockées séparément en Phase 1)

### Phase 2 — Liste + filtres + fiche (À FAIRE)
### Phase 3 — Composer email + séquences (À FAIRE)
### Phase 4 — Pipeline kanban + dashboard (À FAIRE)
### Phase 5 — Scraping + RGPD + déploiement (À FAIRE)
