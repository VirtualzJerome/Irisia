import Link from "next/link";
import { redirect } from "next/navigation";
import { lireSession } from "../../lib/session";
import { trouverParId } from "../../lib/db";
import BoutonDeconnexion from "../../components/BoutonDeconnexion";

export const metadata = { title: "Mon espace — IRISIA" };
export const dynamic = "force-dynamic";

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <ellipse cx="15" cy="15" rx="13" ry="8.2" stroke="#8F79EA" strokeWidth="1.6" />
      <circle cx="15" cy="15" r="4.6" stroke="#D8B45C" strokeWidth="1.6" />
      <circle cx="15" cy="15" r="1.5" fill="#EFEAF6" />
    </svg>
  );
}

export default async function Espace() {
  const session = await lireSession();
  if (!session) redirect("/connexion");

  const utilisateur = await trouverParId(session.userId);
  if (!utilisateur) redirect("/connexion");

  const verif = utilisateur.statut_verification;

  return (
    <div className="wrap">
      <header className="site">
        <Link className="marque" href="/" aria-label="IRISIA — accueil">
          <Logo /> IRISIA
        </Link>
        <nav className="nav-droite">
          <BoutonDeconnexion />
        </nav>
      </header>

      <main className="espace">
        <h1 className="bienvenue">Bonsoir, {utilisateur.prenom}.</h1>
        <p className="sous-bienvenue">
          Voici votre parcours. Trois pas, et Irisia pourra commencer à chercher
          la bonne personne pour vous.
        </p>

        <div className="parcours">
          <div className="jalon fait">
            <span className="pastille">✓</span>
            <div>
              <h3>Compte créé</h3>
              <p>Bienvenue chez IRISIA. Votre place dans la bêta privée est réservée.</p>
            </div>
            <span className="etat ok">Fait</span>
          </div>

          <div className="jalon">
            <span className="pastille">2</span>
            <div>
              <h3>Vérification photo &amp; vidéo</h3>
              <p>
                {verif === "VERIFIE"
                  ? "Votre profil est vérifié. Merci de contribuer à une communauté sans faux profils."
                  : verif === "EN_ATTENTE"
                  ? "Vos éléments sont en cours de vérification par notre équipe."
                  : "Bientôt disponible — vous serez prévenu par e-mail dès l'ouverture."}
              </p>
            </div>
            <span className={"etat " + (verif === "VERIFIE" ? "ok" : verif === "EN_ATTENTE" ? "attente" : "bientot")}>
              {verif === "VERIFIE" ? "Fait" : verif === "EN_ATTENTE" ? "En cours" : "Bientôt"}
            </span>
          </div>

          <div className="jalon">
            <span className="pastille">3</span>
            <div>
              <h3>Votre entretien avec Irisia</h3>
              <p>
                {utilisateur.entretien_termine
                  ? "Entretien terminé. Irisia vous connaît — elle cherche pour vous."
                  : "Vingt minutes de conversation pour qu'Irisia apprenne qui vous êtes. Ouverture très prochainement."}
              </p>
            </div>
            <span className={"etat " + (utilisateur.entretien_termine ? "ok" : "bientot")}>
              {utilisateur.entretien_termine ? "Fait" : "Bientôt"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
