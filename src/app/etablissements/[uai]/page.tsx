import { FicheClient } from "./fiche-client";

type Props = {
  params: Promise<{ uai: string }>;
};

export default async function EtablissementPage({ params }: Props) {
  const { uai } = await params;
  return <FicheClient uai={uai} />;
}
