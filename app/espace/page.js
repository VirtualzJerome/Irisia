import Link from "next/link";
import { redirect } from "next/navigation";
import { lireSession } from "../../lib/session";
import { trouverParId, presentationActivePour, notificationsPour, listerMedias, profilPublicDe } from "../../lib/db";
import BoutonDeconnexion from "../../components/BoutonDeconnexion";
import { estAdmin } from "../../lib/admin";
import { calculerCompletude } from "../../lib/options-profil";

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

  if (utilisateur.banni)
    return (
      <div className="wrap">
        <header className="site">
          <Link className="marque" href="/">IRISIA</Link>
          <BoutonDeconnexion />
        </header>
        <main className="espace">
          <h1 className="bienvenue">Compte suspendu</h1>
          <p className="sous-bienvenue">
            Ce compte a été suspendu à la suite d&apos;un signalement. Si vous pensez
            qu&apos;il s&apos;agit d&apos;une erreur, contactez-nous. Vous conservez vos
            droits sur vos données depuis la page <Link href="/compte">Mon compte</Link>.
          </p>
        </main>
      </div>
    );

  const verif = utilisateur.statut_verification;
  const nbPhotos = (await listerMedias(utilisateur.id)).filter((m) => m.type === "photo").length;
  const completude = calculerCompletude(profilPublicDe(utilisateur), nbPhotos);
  const pret = verif === "VERIFIE" && utilisateur.entretien_termine;
  const pres = pret ? await presentationActivePour(utilisateur.id) : null;
  const mutuelle = pres && pres.reponse_a === "ACCEPTE" && pres.reponse_b === "ACCEPTE";
  const notif = pret ? await notificationsPour(utilisateur.id) : { type: null };
  const photoId = (await listerMedias(utilisateur.id)).find((m) => m.type === "photo")?.id || null;

  return (
    <div className="wrap">
      <header className="site">
        <Link className="marque" href="/" aria-label="IRISIA — accueil">
          <Logo /> IRISIA
        </Link>
        <nav className="nav-droite">
          {photoId && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="avatar" src={"/api/media/" + photoId} alt="" aria-hidden="true" />
          )}
          {estAdmin(utilisateur) && <Link className="lien-nav" href="/admin">Admin</Link>}
          <Link className="lien-nav" href="/profil">Mon profil</Link>
          <Link className="lien-nav" href="/compte">Mon compte</Link>
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

          <div className={"jalon" + (verif === "VERIFIE" ? " fait" : "")}>
            <span className="pastille">{verif === "VERIFIE" ? "✓" : "2"}</span>
            <div>
              <h3>Vérification photo &amp; vidéo</h3>
              <p>
                {verif === "VERIFIE"
                  ? "Votre profil est vérifié. Merci de contribuer à une communauté sans faux profils."
                  : verif === "EN_ATTENTE"
                  ? "Vos éléments sont en cours d'examen par notre équipe — vous serez prévenu très vite."
                  : verif === "REFUSE"
                  ? "Votre dossier n'a pas pu être validé — recommencez quand vous voulez."
                  : "Quelques photos et un selfie vidéo de 5 secondes : la garantie d'une communauté 100 % réelle."}
              </p>
              {(verif === "NON_VERIFIE" || verif === "REFUSE") && (
                <p style={{ marginTop: "14px" }}>
                  <Link className="bouton" href="/verification">
                    {verif === "REFUSE" ? "Recommencer la vérification" : "Commencer la vérification"}
                  </Link>
                </p>
              )}
            </div>
            <span className={"etat " + (verif === "VERIFIE" ? "ok" : verif === "EN_ATTENTE" ? "attente" : verif === "REFUSE" ? "attente" : "attente")}>
              {verif === "VERIFIE" ? "Fait" : verif === "EN_ATTENTE" ? "En cours" : verif === "REFUSE" ? "À refaire" : "À faire"}
            </span>
          </div>

          <div className={"jalon" + (utilisateur.entretien_termine ? " fait" : "")}>
            <span className="pastille">{utilisateur.entretien_termine ? "✓" : "3"}</span>
            <div>
              <h3>Votre entretien avec Irisia</h3>
              <p>
                {utilisateur.entretien_termine
                  ? "Entretien terminé. Irisia vous connaît — elle cherche pour vous."
                  : "Une quinzaine de minutes de conversation pour qu'Irisia apprenne qui vous êtes. Elle vous attend."}
              </p>
              {!utilisateur.entretien_termine && (
                <p style={{ marginTop: "14px" }}>
                  <Link className="bouton" href="/entretien">Commencer l'entretien</Link>
                </p>
              )}
            </div>
            <span className={"etat " + (utilisateur.entretien_termine ? "ok" : "attente")}>
              {utilisateur.entretien_termine ? "Fait" : "À faire"}
            </span>
          </div>
        </div>

        {completude < 100 && (
          <div className="parcours" style={{ marginTop: "18px" }}>
            <div className="jalon">
              <span className="pastille">✨</span>
              <div style={{ flex: 1 }}>
                <h3>Votre profil — complet à {completude}&nbsp;%</h3>
                <p>Photos, passions, bio écrite par Irisia, couleur… Plus votre profil est riche, plus Irisia voit juste.</p>
                <p style={{ marginTop: "14px" }}>
                  <Link className="bouton" href="/profil">Compléter mon profil</Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {pret && (
          <div className="parcours" style={{ marginTop: "18px" }}>
            <div className="jalon fait">
              <span className="pastille">🌿</span>
              <div>
                <h3>Vos présentations</h3>
                <p>
                  {notif.type === "conversation" && notif.non_lus > 0
                    ? `💬 ${notif.non_lus} nouveau${notif.non_lus > 1 ? "x" : ""} message${notif.non_lus > 1 ? "s" : ""} vous attend${notif.non_lus > 1 ? "ent" : ""}.`
                    : mutuelle
                    ? "Une conversation est ouverte — quelqu'un vous attend."
                    : notif.type === "presentation"
                    ? "🌿 Irisia a quelqu'un à vous présenter."
                    : notif.type === "attente_reponse"
                    ? "Vous avez dit oui — Irisia attend la réponse de l'autre côté."
                    : "Votre parcours est complet. Irisia cherche pour vous, et ne vous présentera quelqu'un que lorsqu'elle y croira vraiment."}
                </p>
                <p style={{ marginTop: "14px" }}>
                  <Link className="bouton" href="/presentations">
                    {mutuelle ? "Reprendre la conversation" : pres ? "Découvrir la présentation" : "Voir mes présentations"}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
