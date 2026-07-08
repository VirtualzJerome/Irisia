import Link from "next/link";

export const metadata = { title: "Confidentialité — IRISIA" };

export default function Confidentialite() {
  return (
    <main className="page-legale">
      <h1>Politique de confidentialité</h1>
      <p>
        IRISIA collecte uniquement les données nécessaires à son service de mise en
        relation : votre prénom, votre adresse e-mail, votre date de naissance et,
        prochainement, les réponses que vous confierez à Irisia lors de votre entretien.
      </p>
      <p>
        Vos données sont hébergées en Union européenne. Elles ne sont jamais vendues ni
        partagées avec des tiers à des fins publicitaires. Depuis la page &laquo;&nbsp;Mon compte&nbsp;&raquo;, vous pouvez à tout moment
        télécharger l&apos;intégralité de vos données, ou supprimer définitivement votre
        compte — photos, vidéo, entretien, présentations et conversations compris,
        sans copie conservée.
      </p>
      <p>
        Ce document sera complété avant l&apos;ouverture publique du service.
      </p>
      <p><Link href="/">← Retour à l&apos;accueil</Link></p>
    </main>
  );
}
