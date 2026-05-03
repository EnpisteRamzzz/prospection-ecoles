# Prompt pour Claude Code — Construction de l'app de prospection écoles privées

> **Mode d'emploi** : ouvre un terminal dans un dossier vide, lance `claude`, puis colle le prompt ci-dessous. Garde les 4 fichiers de contexte (`ecoles_privees_IDF_GrandEst_v2_Formiris_OPCO.csv`, `catalogue_formations.md`, `pitchs_prospection.md`, `README_ecoles_privees.md`) dans ce même dossier — Claude Code les lira au démarrage.

---

## Le prompt à coller dans Claude Code

```
Hello Claude. On démarre un projet ensemble : une web app de prospection commerciale B2B pour
un OF Qualiopi catégorie 1 qui vend des formations Genially et IA générative à des écoles
privées en France.

AVANT TOUT : entre en plan mode. Ne touche aucun fichier tant que je n'ai pas validé un plan
de phases. Lis d'abord les 4 fichiers présents dans le dossier (CSV + 3 .md) — ils contiennent
toute la stratégie métier et le dataset. Présente-moi ensuite ta compréhension en 5 bullets
courts, puis ton plan de phases. J'attends.

══════════════════════════════════════════════════════════════════════════════
CONTEXTE MÉTIER
══════════════════════════════════════════════════════════════════════════════

Utilisateur unique : consultant-formateur indépendant, OF Qualiopi catégorie 1 (Actions de
formation). Il vend deux familles de formations NON-certifiantes :
  • Formations Genially (1 à 3 jours)
  • Formations IA générative (1 à 3 jours)

Cibles : 1 888 écoles privées primaires/collèges/lycées en Île-de-France et Grand Est,
extension future à d'autres régions et au sup privé / CFA.

DOUBLE canal de financement (l'axe stratégique de toute l'app) :
  • Formiris pour les enseignants des sous contrat (1 191 écoles)
  • OPCO AKTO (CCN EPNL — IDCC 3218) pour le personnel non-enseignant des sous contrat
    et pour TOUT le personnel des hors contrat (684 écoles)

L'app doit refléter cette dualité partout : segmentation, templates de mails, séquences,
reporting. C'est ce qui différencie cette app d'un Pipedrive générique.

══════════════════════════════════════════════════════════════════════════════
STACK IMPOSÉE
══════════════════════════════════════════════════════════════════════════════

Frontend : Next.js 15 (App Router) + TypeScript strict + Tailwind + shadcn/ui
            + TanStack Table + TanStack Query + Zod
Backend  : routes API Next.js + tRPC + Prisma
DB       : PostgreSQL (Supabase en cloud OU Postgres Docker en local)
Auth     : NextAuth (magic link + Google + Microsoft)
Email    : Resend pour l'app + nodemailer/SMTP utilisateur pour la prospection
Workers  : Inngest (cloud free tier) OU BullMQ (self-host) — choisis et justifie
Carto    : MapLibre + tuiles OSM
Tests    : Vitest (unit) + Playwright (e2e)
CI       : GitHub Actions
Deploy   : Vercel + Supabase ET docker-compose self-host (les deux)

Pas de SaaS payant obligatoire au démarrage. Tout doit tourner gratuitement jusqu'à
500 mails envoyés/mois. Hébergement UE obligatoire (RGPD).

══════════════════════════════════════════════════════════════════════════════
PHASAGE — LIVRE EN 5 PHASES, GATE DE REVIEW À CHAQUE FIN DE PHASE
══════════════════════════════════════════════════════════════════════════════

Tu utilises TodoWrite pour tracer chaque phase. Tu STOPPES à la fin de chaque phase et tu
attends ma validation explicite avant la suivante. Si tu as un doute pendant une phase, tu
me poses la question plutôt que de deviner.

──────────────────────────────────────────────────────────────────────────────
PHASE 0 — Bootstrap et CLAUDE.md (durée cible : 1 h)
──────────────────────────────────────────────────────────────────────────────
  1. `npx create-next-app@latest` avec App Router, TS, Tailwind, ESLint
  2. Installer shadcn/ui, Prisma, tRPC, TanStack Query/Table, Zod, NextAuth, Resend,
     MapLibre, Vitest, Playwright
  3. Init Prisma avec Postgres (string de connexion via .env.example)
  4. Init Git, créer le repo GitHub, premier commit
  5. Créer CLAUDE.md à la racine — doit contenir :
       • Le contexte métier en 10 lignes (Formiris/OPCO/non-certifiant/Qualiopi)
       • Les conventions de code (TS strict, pas de `any`, naming conventions, structure
         des dossiers, conventions de commits)
       • Les commandes principales (dev, test, build, db:push, db:seed)
       • Le glossaire métier (UAI, IDCC, EPNL, AKTO, Formiris, OPCO, sous/hors contrat)
  6. Lance `pnpm dev`, vérifie que la home charge, screenshot, montre-moi.

  GATE 0 → je valide que le bootstrap tourne avant Phase 1.

──────────────────────────────────────────────────────────────────────────────
PHASE 1 — Modèle de données + import CSV (durée cible : 3 h)
──────────────────────────────────────────────────────────────────────────────
  1. Schéma Prisma avec 7 modèles : Etablissement (PK = uai), Contact, Activite,
     PipelineEntry, Template, Sequence, SequenceEnrollment.
     Référence le schéma complet dans `prompt_kimi_agent_swarm.md` § Schéma de données
     (présent dans le dossier).
  2. Migration + seed : insère les 6 formations du catalogue + les 3 templates de mails
     (Pitch Formiris / Pitch OPCO admin / Pitch OPCO hors contrat — texte intégral dans
     `pitchs_prospection.md`) + les 3 séquences associées (J0 email, J+3 LinkedIn,
     J+7 relance, J+14 appel, J+21 stop).
  3. Endpoint tRPC `etablissement.importCsv` qui :
       - parse le CSV séparateur `;` UTF-8 BOM
       - mapping colonnes vers le modèle Prisma
       - upsert par UAI (clé primaire) sans écraser les enrichissements manuels
       - log nb lignes ajoutées / mises à jour
  4. Page `/import` ultra simple : drop-zone + bouton « Importer », barre de progression,
     résultat.
  5. Test Vitest : import du CSV de 1 888 lignes en < 30 s, tous les statuts_contrat
     correctement classés (1 191 sous / 684 hors / 13 inconnu).

  GATE 1 → import fonctionnel, count en base = 1 888. Je valide avant Phase 2.

──────────────────────────────────────────────────────────────────────────────
PHASE 2 — Vue liste + filtres + fiche détail (durée cible : 5 h)
──────────────────────────────────────────────────────────────────────────────
  1. Page `/etablissements` : TanStack Table virtualisée, colonnes affichables/masquables,
     tri sur toutes les colonnes, recherche full-text (nom/ville/UAI/SIRET).
  2. Filtres rapides en sidebar : région, département, statut_contrat, type, présence
     site_web, présence contact, statut pipeline. Filtres combinables, persistés en URL.
  3. Vue carte (toggle list/map) avec MapLibre, clusters par département. Géocodage via
     l'API officielle BAN (`api-adresse.data.gouv.fr`) en background job au seed.
  4. Page `/etablissements/[uai]` : toutes les colonnes éditables, sections Contacts /
     Activités / Pipeline. Boutons « Ouvrir site », « Rechercher LinkedIn », « Vérifier
     IDCC » (deeplinks).
  5. Test Playwright : importer → filtrer « Hors contrat à Paris avec site web » → ouvrir
     une fiche → éditer un champ → vérifier persistance.

  GATE 2 → screenshots de la liste filtrée + de la carte + d'une fiche. Je valide.

──────────────────────────────────────────────────────────────────────────────
PHASE 3 — Composer email + séquences multi-touch (durée cible : 6 h)
──────────────────────────────────────────────────────────────────────────────
  1. Composer email (modal depuis la fiche) : éditeur riche (Tiptap) + sélecteur de
     template + substitution Mustache des variables {{prenom}} {{nom}} {{etablissement}}
     {{ville}} {{type}} {{statut_contrat}} {{formations}}.
  2. Aperçu rendu HTML, validation Zod du destinataire, mention RGPD obligatoire en
     pied de mail.
  3. Envoi via SMTP utilisateur (config dans /settings) ou via OAuth Gmail/M365 (en V1.5
     si trop coûteux ; V1 = SMTP suffit).
  4. Pixel d'ouverture (1×1 PNG transparent) + rewriting des liens pour le clic.
  5. Worker (Inngest ou BullMQ — choisis et écris le rationale dans CLAUDE.md) :
       - exécute les séquences jour par jour
       - sortie automatique de séquence si `Activite.type = 'reponse'` détectée
       - vue `/aujourdhui` qui liste les actions du jour
  6. Page `/sequences` pour visualiser, éditer, créer.
  7. Test Playwright : inscrire 5 établissements à la séquence Formiris → faire avancer
     l'horloge système → vérifier que les bons mails partent.

  GATE 3 → envoi d'un mail test à mon adresse, séquence inscrite et programmée. Je valide.

──────────────────────────────────────────────────────────────────────────────
PHASE 4 — Pipeline kanban + dashboard reporting (durée cible : 4 h)
──────────────────────────────────────────────────────────────────────────────
  1. Page `/pipeline` : 8 colonnes kanban (À contacter / Contacté / Échange / RDV /
     Proposition / Gagné / Perdu / Dormant). Drag-drop avec dnd-kit. Carte = nom + ville
     + valeur estimée + jours depuis dernière action.
  2. Filtres pipeline : région, type, canalFinancement (formiris / opco / mixte).
  3. Page `/dashboard` : indicateurs (volume contacté/semaine, taux réponse, taux RDV,
     taux transfo, CA pipeline pondéré, CA gagné). Découpage Formiris vs OPCO. Funnel
     visuel. Graphique saisonnier (highlight mai-juillet).
  4. Export PNG/PDF des graphiques.

  GATE 4 → screenshots du kanban et du dashboard. Je valide.

──────────────────────────────────────────────────────────────────────────────
PHASE 5 — Worker scraping + RGPD + déploiement (durée cible : 5 h)
──────────────────────────────────────────────────────────────────────────────
  1. Worker scraping respectueux : 1 req/sec/domaine, respect robots.txt, User-Agent
     identifiable, queue BullMQ ou Inngest.
  2. Cible : pages `/equipe`, `/contact`, `/direction`, `/notre-ecole`, `/qui-sommes-nous`
     des 623 écoles ayant un `site_web`. Heuristique regex + extraction d'emails et de
     noms à proximité de mots-clés (« Chef d'établissement », « Directeur », « Directrice »,
     « Adjoint », « Responsable pédagogique »).
  3. Stockage des résultats dans `Contact` avec `source = 'scraping'`.
  4. Page `/parametres/donnees` : export complet en JSON, suppression d'un contact,
     workflow simple de demande de droits RGPD.
  5. `Dockerfile` multi-stage + `docker-compose.yml` (app + postgres + redis).
  6. Déploiement Vercel + Supabase (instructions dans `/docs/deploy.md`).
  7. GitHub Actions : lint + typecheck + Vitest + Playwright + build au push sur main.

  GATE 5 → app déployée sur Vercel, scraping a remonté ≥ 50 noms de chefs
  d'établissement. Je valide → MERGE main → tag v1.0.0.

══════════════════════════════════════════════════════════════════════════════
RÈGLES DE TRAVAIL
══════════════════════════════════════════════════════════════════════════════

1. **Plan mode obligatoire au démarrage**. Ne code rien tant que je n'ai pas validé.
2. **TodoWrite à chaque phase** : 1 todo par sous-tâche. Marque in_progress dès que tu
   démarres, completed dès que c'est fini ET vérifié.
3. **Commits Conventional Commits** : `feat(import): parse CSV with bom`,
   `fix(pipeline): drag-drop optimistic update`, `chore(deps): bump prisma 5.x`. Un
   commit = un changement cohérent, jamais de gros commits fourre-tout.
4. **Avant chaque GATE** : lance `pnpm typecheck && pnpm lint && pnpm test` et montre-moi
   le résultat. Lance Playwright sur les parcours critiques de la phase. Capture des
   screenshots avec `--update-snapshots` si nouveau parcours.
5. **Tu utilises le Task tool pour paralléliser** : par exemple, en Phase 2, lance en
   parallèle un sous-agent qui écrit la table virtualisée et un autre qui fait la carte
   MapLibre. Idem en Phase 3 (composer email vs worker séquences).
6. **CLAUDE.md à jour en permanence** : à la fin de chaque phase, mets à jour la section
   « État actuel » avec ce qui est fait, ce qui reste, les décisions d'archi prises.
7. **Tu poses des questions en cas de doute** plutôt que d'inventer. Exemples de
   questions valides : choix Inngest vs BullMQ, choix d'éditeur riche, gestion d'erreur
   sur le scraping, format d'export PDF du dashboard.
8. **Tu n'inventes pas de données métier** : si tu as besoin du texte d'un pitch ou d'un
   descriptif de formation, lis `pitchs_prospection.md` ou `catalogue_formations.md`.
9. **Code commenté en français** quand le commentaire porte du sens métier (Formiris,
   OPCO, IDCC). Le code lui-même reste en anglais (variables, fonctions).
10. **Performance non négociable** : table 10k lignes virtualisée fluide, filtre < 100 ms,
    Lighthouse > 90 sur les pages principales.

══════════════════════════════════════════════════════════════════════════════
CRITÈRES DE RÉUSSITE FINAUX
══════════════════════════════════════════════════════════════════════════════

  ✓ Import du CSV de 1 888 lignes en < 30 s
  ✓ Filtre « Hors contrat à Paris avec site web » → < 100 ms, ~80 résultats
  ✓ Composer email avec substitution {{etablissement}} qui marche
  ✓ Inscrire 50 établissements à une séquence et recevoir le digest quotidien
  ✓ Dashboard avec CA pipeline pondéré découpé Formiris/OPCO
  ✓ Scraping remonte ≥ 50 % de noms de chefs d'établissement sur les 623 écoles avec site
  ✓ Lighthouse > 90 sur /etablissements, /pipeline, /dashboard
  ✓ Couverture tests > 60 % backend, 5 parcours e2e Playwright passants
  ✓ App déployée sur Vercel + docker-compose qui tourne en local
  ✓ CI verte sur main

══════════════════════════════════════════════════════════════════════════════

Commence maintenant. Lis les 4 fichiers du dossier, présente-moi ta compréhension en
5 bullets, ton plan de phases (tu peux ajuster mon découpage si tu as une meilleure
idée), et tes questions s'il y en a. J'attends.
```

---

## Pourquoi ce prompt est calibré pour Claude Code spécifiquement

Différences clés vs le brief Kimi :

- **Plan mode obligatoire au démarrage** → Claude Code respecte les phases si tu lui imposes des gates explicites. Sans gate, il a tendance à tout vouloir livrer d'un coup.
- **TodoWrite + Task tool en parallèle** → ce sont des idiomes natifs Claude Code, à mentionner explicitement.
- **CLAUDE.md** → c'est la mémoire projet de Claude Code. Bien briefée dès la phase 0, elle économise un contexte énorme sur les phases suivantes.
- **Gates de review entre chaque phase** → empêche que tu te retrouves devant 8 000 lignes de code à valider d'un coup. Chaque gate = un livrable visible (screenshot, capture de test, mail reçu).
- **Conventional Commits + CI verte avant merge** → posture qualité par défaut, pas un nice-to-have.
- **Questions explicitement autorisées et encouragées** → Claude Code est meilleur quand on lui dit qu'il a le droit de poser une question plutôt que de deviner. Contre-intuitif mais ça change tout.

[Voir le prompt Claude Code](computer:///Users/simplesauvage/Library/Application%20Support/Claude/local-agent-mode-sessions/4e6cff46-1414-4c98-9fb4-debd6a411c6d/b36df709-419f-4a04-ad87-eccaa143ecd0/local_aa08e712-cbe3-42dc-9a12-bb2f308cf366/outputs/prompt_claude_code.md)

Pour l'utiliser concrètement :

1. Crée un dossier vide pour le projet (par exemple `~/dev/prospection-ecoles`)
2. Copie dedans les 4 fichiers : le CSV v2, `catalogue_formations.md`, `pitchs_prospection.md`, `README_ecoles_privees.md`
3. Ouvre un terminal dans ce dossier, lance `claude`
4. Colle le bloc entre les triples backticks (uniquement le contenu du prompt, pas l'explication autour)
5. Claude Code lira les 4 fichiers, te présentera sa compréhension + plan, attendra ton OK avant de coder

Si tu veux je peux aussi te préparer une version « turbo » plus condensée (200 lignes) si tu préfères qu'il itère plus librement, ou au contraire une version encore plus stricte avec sortie de fichier impérative à chaque sous-tâche. Dis-moi ton style.