import Link from "next/link";

export const metadata = { title: "Mentions légales — IRISIA" };

export default function MentionsLegales() {
  return (
    <main className="page-legale">
      <h1>Mentions légales</h1>
      <p>IRISIA — service en cours de développement (bêta privée).</p>
      <p>
        Les informations d&apos;éditeur et d&apos;hébergement seront complétées avant
        l&apos;ouverture publique du service.
      </p>
      <p><Link href="/">← Retour à l&apos;accueil</Link></p>
    </main>
  );
}
