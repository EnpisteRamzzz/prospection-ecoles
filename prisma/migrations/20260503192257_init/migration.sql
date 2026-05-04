-- CreateEnum
CREATE TYPE "statut_contrat" AS ENUM ('Sous contrat', 'Hors contrat', 'Inconnu');

-- CreateEnum
CREATE TYPE "contact_source" AS ENUM ('manual', 'scraping', 'linkedin', 'import');

-- CreateEnum
CREATE TYPE "type_activite" AS ENUM ('email', 'linkedin', 'appel', 'reponse', 'note', 'rdv', 'simulation');

-- CreateEnum
CREATE TYPE "canal_activite" AS ENUM ('email', 'linkedin', 'telephone', 'visio', 'presentiel');

-- CreateEnum
CREATE TYPE "statut_pipeline" AS ENUM ('À contacter', 'Contacté', 'Échange', 'RDV', 'Proposition', 'Gagné', 'Perdu', 'Dormant');

-- CreateEnum
CREATE TYPE "canal_financement" AS ENUM ('Formiris', 'OPCO', 'Mixte');

-- CreateEnum
CREATE TYPE "statut_enrollment" AS ENUM ('active', 'paused', 'completed', 'exited');

-- CreateTable
CREATE TABLE "etablissements" (
    "uai" TEXT NOT NULL,
    "nomEtablissement" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nature" TEXT,
    "typeContratBrut" TEXT,
    "statutContrat" "statut_contrat" NOT NULL DEFAULT 'Inconnu',
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "codeDept" TEXT,
    "departement" TEXT,
    "region" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "siret" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocodedAt" TIMESTAMP(3),
    "publicFormiris" BOOLEAN NOT NULL DEFAULT false,
    "publicOpco" BOOLEAN NOT NULL DEFAULT false,
    "opcoProb" TEXT,
    "formationsProposables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactDecisionnaire" TEXT,
    "fonctionContact" TEXT,
    "profilPedagogiqueNotes" TEXT,
    "etat" TEXT NOT NULL DEFAULT 'Ouvert',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etablissements_pkey" PRIMARY KEY ("uai")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "prenom" TEXT,
    "nom" TEXT,
    "fonction" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "linkedin" TEXT,
    "source" "contact_source" NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activites" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" "type_activite" NOT NULL,
    "canal" "canal_activite",
    "objet" TEXT,
    "contenu" TEXT,
    "statut" TEXT,
    "ouvertLe" TIMESTAMP(3),
    "cliqueLe" TIMESTAMP(3),
    "sequenceId" TEXT,
    "enrollmentId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_entries" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "statut" "statut_pipeline" NOT NULL DEFAULT 'À contacter',
    "canalFinancement" "canal_financement" NOT NULL DEFAULT 'Mixte',
    "valeurEstimee" DOUBLE PRECISION,
    "probabilite" DOUBLE PRECISION,
    "notes" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'email',
    "pitchType" TEXT,
    "objet" TEXT,
    "contenu" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "pitchType" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_enrollments" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "contactId" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "exitReason" TEXT,
    "statut" "statut_enrollment" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_entries_etablissementId_key" ON "pipeline_entries"("etablissementId");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_enrollments_etablissementId_sequenceId_key" ON "sequence_enrollments"("etablissementId", "sequenceId");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "etablissements"("uai") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "etablissements"("uai") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "sequence_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "etablissements"("uai") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "etablissements"("uai") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
