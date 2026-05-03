import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seed en cours…");

  // ───────────────────────────────────────────────────────────────────────
  // 6 FORMATIONS (catalogue_formations.md)
  // ───────────────────────────────────────────────────────────────────────

  // Catalogue de référence — les slugs sont référencés dans les templates et formationsProposables
  // Les formations ne sont pas stockées en base propre (Phase 1) — elles vivent via les slugs.
  void [
    {
      slug: "ia-pratique-enseignante",
      nom: "L'IA générative au service de la pratique enseignante",
      dureeHeures: 14,
      canal: "Formiris",
      description:
        "Cas d'usage : génération de séquences pédagogiques, différenciation, création d'exercices, évaluations formatives, fiches de révision. Outils : ChatGPT, Claude, Mistral Le Chat, Copilot, NotebookLM. Posture critique : hallucinations, RGPD scolaire.",
      public: "Enseignants tous niveaux",
      format: "2 jours présentiel ou 1j présentiel + 1j distanciel",
    },
    {
      slug: "genially-enseigner",
      nom: "Genially pour enseigner — créer des supports interactifs engageants",
      dureeHeures: 14,
      canal: "Formiris",
      description:
        "Leçons interactives, escape games pédagogiques, quiz auto-correctifs, parcours de révision, supports différenciés. Croisement avec H5P, Canva, La Quizinière.",
      public: "Enseignants tous niveaux",
      format: "2 jours présentiel",
    },
    {
      slug: "ia-genially-sequence",
      nom: "IA + Genially : concevoir une séquence pédagogique de A à Z",
      dureeHeures: 21,
      canal: "Formiris",
      description:
        "Workflow : conception de séquence assistée par IA → mise en forme interactive sur Genially → diffusion ENT. Format atelier-projet : chaque participant repart avec une séquence prête à utiliser.",
      public: "Enseignants tous niveaux",
      format: "3 jours atelier-projet",
    },
  ];

  void [
    {
      slug: "ia-admin-direction",
      nom: "L'IA générative pour le personnel administratif et de direction",
      dureeHeures: 14,
      canal: "OPCO AKTO",
      description:
        "Cas d'usage : courriers parents, comptes-rendus, livrets d'accueil, fiches de poste, plans de communication. Sécurité RGPD. Atelier : construire un dossier de prompts type pour son poste.",
      public: "Direction, adjoints, vie scolaire, secrétariat, admin",
      format: "2 jours présentiel",
    },
    {
      slug: "genially-communication",
      nom: "Genially pour la communication et l'administration scolaire",
      dureeHeures: 7,
      canal: "OPCO AKTO",
      description:
        "Livrets d'accueil interactifs, présentations parents/conseils, brochures fin d'année, supports portes ouvertes, livrets d'orientation. Marque scolaire et identité visuelle.",
      public: "Direction, communication, admin",
      format: "1 jour présentiel",
    },
    {
      slug: "pack-productivite-ia",
      nom: "Pack productivité IA — outils du quotidien (vie scolaire / accueil)",
      dureeHeures: 7,
      canal: "OPCO AKTO",
      description:
        "Reformulation et synthèse, gestion d'agenda, rédaction d'emails parents, dictée vocale et transcription de réunions, automatisations simples.",
      public: "Vie scolaire, accueil, secrétariat",
      format: "1 jour présentiel",
    },
  ];

  // On stocke les formations dans une table séparée si elle existe,
  // sinon on les référence uniquement via les slugs dans les templates/séquences.
  // Pour Phase 1, les formations sont référencées dans les templates via JSON.
  console.log("  ✓ Catalogue formations prêt (6 formations)");

  // ───────────────────────────────────────────────────────────────────────
  // 3 TEMPLATES (texte intégral de pitchs_prospection.md)
  // ───────────────────────────────────────────────────────────────────────

  await prisma.template.upsert({
    where: { slug: "pitch-formiris-j0" },
    update: {},
    create: {
      slug: "pitch-formiris-j0",
      nom: "Pitch Formiris — Email J0 (enseignants sous contrat)",
      canal: "email",
      pitchType: "formiris",
      objet:
        "Plan de formation 2026 — IA générative et outils interactifs pour vos enseignants",
      contenu: `<p>Bonjour {{prenom}} {{nom}},</p>

<p>Je vous contacte au sujet du plan de formation des enseignants de <strong>{{etablissement}}</strong> pour l'année 2026-2027.</p>

<p>L'IA générative et la création de supports interactifs sont aujourd'hui les deux demandes les plus fortes côté enseignants. Nous proposons trois parcours conçus pour le second degré du privé sous contrat, <strong>finançables via Formiris</strong> :</p>

<ul>
  <li><strong>L'IA au service de la pratique enseignante</strong> (2 jours) — différenciation, création d'exercices, conception de séquences</li>
  <li><strong>Genially pour enseigner</strong> (2 jours) — leçons interactives, escape games, quiz auto-correctifs</li>
  <li><strong>IA + Genially : concevoir une séquence de A à Z</strong> (3 jours, format atelier-projet)</li>
</ul>

<p>Tous nos parcours sont <strong>non-certifiants</strong> mais éligibles au plan de formation continue Formiris dès lors qu'ils s'intègrent à votre projet d'établissement. Nous sommes Qualiopi catégorie « Actions de formation ».</p>

<p>Je peux passer 20 minutes en visio pour vous présenter les contenus et les modalités d'inscription Formiris. Avez-vous une dispo cette semaine ?</p>

<p>Cordialement,</p>`,
      variables: [
        "prenom",
        "nom",
        "etablissement",
        "ville",
        "type",
        "statut_contrat",
      ],
    },
  });

  await prisma.template.upsert({
    where: { slug: "pitch-opco-sous-contrat-j0" },
    update: {},
    create: {
      slug: "pitch-opco-sous-contrat-j0",
      nom: "Pitch OPCO — Email J0 (admin/direction sous contrat)",
      canal: "email",
      pitchType: "opco-sous-contrat",
      objet:
        "Formation IA + Genially pour votre équipe admin et direction — pris en charge AKTO",
      contenu: `<p>Bonjour {{prenom}} {{nom}},</p>

<p>Au-delà de vos enseignants (qui relèvent de Formiris), votre équipe administrative, de direction et de vie scolaire de <strong>{{etablissement}}</strong> est confrontée chaque jour à des tâches qui peuvent être considérablement accélérées par l'IA générative et par des outils comme Genially : courriers parents, livrets d'accueil, comptes-rendus de conseils, supports portes ouvertes, communications internes.</p>

<p>Nous proposons trois modules courts pensés pour ce public :</p>

<ul>
  <li><strong>IA générative pour l'admin et la direction</strong> (2 jours) — courriers, comptes-rendus, communication, sécurité RGPD</li>
  <li><strong>Genially pour la communication scolaire</strong> (1 jour) — livrets d'accueil, supports parents et portes ouvertes</li>
  <li><strong>Pack productivité IA — vie scolaire</strong> (1 jour) — emails, agendas, automatisations</li>
</ul>

<p>Ces formations relèvent du plan de développement des compétences et sont <strong>prises en charge par AKTO</strong> (CCN EPNL — IDCC 3218). Format intra à privilégier : 1 200 à 1 800 € HT/jour pour toute votre équipe non-enseignante. Nous sommes Qualiopi catégorie « Actions de formation ».</p>

<p>20 minutes en visio cette semaine pour calibrer un parcours sur votre établissement ?</p>

<p>Cordialement,</p>`,
      variables: [
        "prenom",
        "nom",
        "etablissement",
        "ville",
        "type",
        "statut_contrat",
      ],
    },
  });

  await prisma.template.upsert({
    where: { slug: "pitch-opco-hors-contrat-j0" },
    update: {},
    create: {
      slug: "pitch-opco-hors-contrat-j0",
      nom: "Pitch OPCO — Email J0 (hors contrat, toute l'équipe)",
      canal: "email",
      pitchType: "opco-hors-contrat",
      objet:
        "Formation IA + Genially en intra pour {{etablissement}} — financement OPCO sur l'ensemble de l'équipe",
      contenu: `<p>Bonjour {{prenom}} {{nom}},</p>

<p>Particularité des écoles hors contrat : votre équipe complète — enseignants, équipe pédagogique, administration — relève d'une convention collective privée (généralement EPNL ou similaire) et est <strong>éligible au financement OPCO</strong> sur l'ensemble de l'effectif. C'est un levier souvent sous-exploité.</p>

<p>Notre proposition : un parcours intra de 2 jours <strong>« IA + Genially pour {{etablissement}} »</strong> pour toute votre équipe pédagogique, articulé autour de votre projet pédagogique.</p>

<ul>
  <li><strong>Jour 1</strong> : IA générative pour préparer cours, exercices et différenciation</li>
  <li><strong>Jour 2</strong> : Genially pour mettre en forme et publier des supports interactifs</li>
</ul>

<p>Atelier-projet : chaque participant repart avec une séquence pédagogique prête à utiliser. Tarif intra 1 200 à 2 200 € HT/jour (groupe 6 à 12), pris en charge par votre OPCO via le PDC. Nous sommes Qualiopi catégorie « Actions de formation » — formations non-certifiantes mais finançables.</p>

<p>Je propose un appel de cadrage de 20 minutes pour voir comment articuler ce parcours avec votre rentrée 2026.</p>

<p>Cordialement,</p>`,
      variables: [
        "prenom",
        "nom",
        "etablissement",
        "ville",
        "type",
        "statut_contrat",
      ],
    },
  });

  // Templates LinkedIn (variantes courtes)
  await prisma.template.upsert({
    where: { slug: "linkedin-sous-contrat-j3" },
    update: {},
    create: {
      slug: "linkedin-sous-contrat-j3",
      nom: "LinkedIn DM J+3 — Sous contrat",
      canal: "linkedin",
      pitchType: "formiris",
      objet: null,
      contenu:
        "Bonjour {{prenom}}, je remarque que {{etablissement}} développe son numérique pédagogique. Nous formons les enseignants du privé sous contrat sur l'IA et Genially — Formiris pour les enseignants, AKTO pour votre admin/direction. Un quart d'heure pour en parler ?",
      variables: ["prenom", "etablissement"],
    },
  });

  await prisma.template.upsert({
    where: { slug: "linkedin-hors-contrat-j3" },
    update: {},
    create: {
      slug: "linkedin-hors-contrat-j3",
      nom: "LinkedIn DM J+3 — Hors contrat",
      canal: "linkedin",
      pitchType: "opco-hors-contrat",
      objet: null,
      contenu:
        "Bonjour {{prenom}}, une formation IA + Genially intra pour toute votre équipe est intégralement finançable par votre OPCO côté hors contrat. 2 jours, format projet, vos enseignants repartent avec des séquences prêtes. Ça vaut un échange ?",
      variables: ["prenom", "etablissement"],
    },
  });

  await prisma.template.upsert({
    where: { slug: "relance-j7" },
    update: {},
    create: {
      slug: "relance-j7",
      nom: "Relance J+7",
      canal: "email",
      pitchType: null,
      objet: "Re : Plan de formation {{etablissement}} — avez-vous eu le temps de regarder ?",
      contenu: `<p>Bonjour {{prenom}},</p>

<p>Je me permets de revenir vers vous concernant ma proposition de formation pour {{etablissement}}. Avez-vous eu le temps de regarder mon précédent message ?</p>

<p>La fenêtre de construction des plans de formation 2026-2027 est ouverte jusqu'en juillet — c'est le moment idéal pour inscrire ces parcours.</p>

<p>Je reste disponible pour un échange rapide si vous le souhaitez.</p>

<p>Cordialement,</p>`,
      variables: ["prenom", "etablissement"],
    },
  });

  console.log("  ✓ Templates créés (3 emails J0 + 2 LinkedIn + 1 relance)");

  // ───────────────────────────────────────────────────────────────────────
  // 3 SÉQUENCES MULTI-TOUCH (21 jours)
  // ───────────────────────────────────────────────────────────────────────

  const stepsFormiris = [
    {
      jour: 0,
      canal: "email",
      templateSlug: "pitch-formiris-j0",
      description: "Email d'approche Formiris",
    },
    {
      jour: 3,
      canal: "linkedin",
      templateSlug: "linkedin-sous-contrat-j3",
      description: "Connexion LinkedIn + DM",
    },
    {
      jour: 7,
      canal: "email",
      templateSlug: "relance-j7",
      description: "Relance email",
    },
    {
      jour: 14,
      canal: "telephone",
      templateSlug: null,
      description: "Appel téléphonique",
    },
    {
      jour: 21,
      canal: "email",
      templateSlug: null,
      description: "Stop ou nurturing trimestriel",
    },
  ];

  await prisma.sequence.upsert({
    where: { id: "seq-formiris" },
    update: { steps: stepsFormiris },
    create: {
      id: "seq-formiris",
      nom: "Séquence Formiris — Enseignants sous contrat",
      description:
        "Séquence 21 jours pour les chefs d'établissement du privé sous contrat. Angle : plan de formation enseignants financé Formiris.",
      pitchType: "formiris",
      steps: stepsFormiris,
    },
  });

  const stepsOpcoSousContrat = [
    {
      jour: 0,
      canal: "email",
      templateSlug: "pitch-opco-sous-contrat-j0",
      description: "Email d'approche OPCO (admin/direction)",
    },
    {
      jour: 3,
      canal: "linkedin",
      templateSlug: "linkedin-sous-contrat-j3",
      description: "Connexion LinkedIn + DM",
    },
    {
      jour: 7,
      canal: "email",
      templateSlug: "relance-j7",
      description: "Relance email",
    },
    {
      jour: 14,
      canal: "telephone",
      templateSlug: null,
      description: "Appel téléphonique",
    },
    {
      jour: 21,
      canal: "email",
      templateSlug: null,
      description: "Stop ou nurturing trimestriel",
    },
  ];

  await prisma.sequence.upsert({
    where: { id: "seq-opco-sous-contrat" },
    update: { steps: stepsOpcoSousContrat },
    create: {
      id: "seq-opco-sous-contrat",
      nom: "Séquence OPCO — Personnel admin sous contrat",
      description:
        "Séquence 21 jours pour le responsable admin/OGEC des écoles sous contrat. Angle : PDC personnel non-enseignant financé AKTO.",
      pitchType: "opco-sous-contrat",
      steps: stepsOpcoSousContrat,
    },
  });

  const stepsOpcoHorsContrat = [
    {
      jour: 0,
      canal: "email",
      templateSlug: "pitch-opco-hors-contrat-j0",
      description: "Email d'approche OPCO toute l'équipe",
    },
    {
      jour: 3,
      canal: "linkedin",
      templateSlug: "linkedin-hors-contrat-j3",
      description: "Connexion LinkedIn + DM",
    },
    {
      jour: 7,
      canal: "email",
      templateSlug: "relance-j7",
      description: "Relance email",
    },
    {
      jour: 14,
      canal: "telephone",
      templateSlug: null,
      description: "Appel téléphonique",
    },
    {
      jour: 21,
      canal: "email",
      templateSlug: null,
      description: "Stop ou nurturing trimestriel",
    },
  ];

  await prisma.sequence.upsert({
    where: { id: "seq-opco-hors-contrat" },
    update: { steps: stepsOpcoHorsContrat },
    create: {
      id: "seq-opco-hors-contrat",
      nom: "Séquence OPCO — Toute l'équipe hors contrat",
      description:
        "Séquence 21 jours pour les directeurs d'école hors contrat (Montessori, alternatives, internationales). Angle : intra toute l'équipe financé OPCO.",
      pitchType: "opco-hors-contrat",
      steps: stepsOpcoHorsContrat,
    },
  });

  console.log("  ✓ Séquences créées (3 séquences × 5 étapes)");
  console.log("🌱 Seed terminé.");

  // Résumé
  const [templates, sequences] = await Promise.all([
    prisma.template.count(),
    prisma.sequence.count(),
  ]);
  console.log(`  Templates en base : ${templates}`);
  console.log(`  Séquences en base : ${sequences}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
