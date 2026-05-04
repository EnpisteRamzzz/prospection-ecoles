import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const [total, sousContrat, horsContrat, inconnu, formiris, opco, avecSiteWeb] = await Promise.all([
    prisma.etablissement.count(),
    prisma.etablissement.count({ where: { statutContrat: "SousContrat" } }),
    prisma.etablissement.count({ where: { statutContrat: "HorsContrat" } }),
    prisma.etablissement.count({ where: { statutContrat: "Inconnu" } }),
    prisma.etablissement.count({ where: { publicFormiris: true } }),
    prisma.etablissement.count({ where: { publicOpco: true } }),
    prisma.etablissement.count({ where: { siteWeb: { not: null } } }),
  ]);
  console.table({ total, sousContrat, horsContrat, inconnu, formiris, opco, avecSiteWeb });
}

main().catch(console.error).finally(() => prisma.$disconnect());
