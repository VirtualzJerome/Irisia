import Link from "next/link";

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <ellipse cx="15" cy="15" rx="13" ry="8.2" stroke="#8F79EA" strokeWidth="1.6" />
      <circle cx="15" cy="15" r="4.6" stroke="#D8B45C" strokeWidth="1.6" />
      <circle cx="15" cy="15" r="1.5" fill="#EFEAF6" />
    </svg>
  );
}

export default function Accueil() {
  return (
    <>
      <div className="wrap">
        <header className="site">
          <Link className="marque" href="/" aria-label="IRISIA — accueil">
            <Logo /> IRISIA
          </Link>
          <nav className="nav-droite">
            <Link className="lien-nav" href="/connexion">Se connecter</Link>
            <Link className="bouton-clair" href="/inscription">Créer mon compte</Link>
          </nav>
        </header>

        {/* ═════════ HÉROS ═════════ */}
        <div className="hero">
          <p className="eyebrow">L&apos;entremetteuse — bêta privée</p>
          <h1>
            Pas un catalogue de visages. <em>Une vraie rencontre.</em>
          </h1>
          <p className="sous">
            Pas de swipe. Pas de faux profils. <strong>Irisia</strong>, votre
            entremetteuse IA, apprend à vous connaître dès l&apos;inscription au fil
            d&apos;une vraie conversation, puis ne vous présente que des personnes{" "}
            <strong>vérifiées et choisies pour vous</strong>.
          </p>
          <div className="actions">
            <Link className="bouton" href="/inscription">Créer mon compte</Link>
          </div>
          <p className="note">
            Bêta privée, places limitées. Aucune publicité, jamais.
          </p>
        </div>

        {/* ═════════ COMMENT ÇA MARCHE ═════════ */}
        <section className="bloc" id="comment">
          <h2>Trois pas vers une vraie rencontre</h2>
          <p className="intro-section">
            Un parcours pensé pour la qualité, pas pour le volume. Chaque étape existe
            pour une seule raison&nbsp;: que la personne en face de vous en vaille la peine.
          </p>
          <div className="etapes">
            <article className="etape">
              <p className="num">Premier pas</p>
              <h3>Prouvez que vous êtes vous</h3>
              <p>
                Photos et selfie vidéo à l&apos;inscription.{" "}
                <strong>100&nbsp;% des membres sont vérifiés</strong>&nbsp;: pas de faux
                profils, pas de bots, pas de mauvaises surprises.
              </p>
            </article>
            <article className="etape">
              <p className="num">Deuxième pas</p>
              <h3>Conversez avec Irisia</h3>
              <p>
                Vingt minutes d&apos;une vraie conversation&nbsp;— pas un questionnaire à
                cases. Vos valeurs, votre rythme de vie, ce que vous cherchez vraiment.{" "}
                <strong>Irisia écoute, comprend, retient.</strong>
              </p>
            </article>
            <article className="etape">
              <p className="num">Troisième pas</p>
              <h3>Recevez vos présentations</h3>
              <p>
                Quand Irisia trouve quelqu&apos;un qui vous correspond vraiment, elle vous
                le présente&nbsp;— et <strong>vous explique pourquoi</strong>. Si le
                courant ne passe pas, dites-le-lui&nbsp;: elle affinera la prochaine
                présentation.
              </p>
            </article>
          </div>
        </section>
      </div>

      {/* ═════════ LA LETTRE D'IRISIA ═════════ */}
      <div className="lettre-fond">
        <div className="wrap">
          <section className="bloc">
            <div className="lettre">
              <p className="de">Un mot d&apos;Irisia</p>
              <p>Bonsoir. Je m&apos;appelle Irisia.</p>
              <p>
                Je ne vous montrerai jamais un catalogue de visages. Je ne vous demanderai
                jamais de juger quelqu&apos;un en une seconde. Ce n&apos;est pas ainsi que
                naissent les histoires qui durent.
              </p>
              <p>
                Nous allons d&apos;abord parler, vous et moi. Puis, quand j&apos;aurai
                trouvé quelqu&apos;un qui vous correspond vraiment, je vous le
                présenterai&nbsp;— et je vous dirai pourquoi je crois en vous deux.
              </p>
              <p className="signature">Irisia</p>
            </div>
          </section>
        </div>
      </div>

      <div className="wrap">
        {/* ═════════ CONFIANCE ═════════ */}
        <section className="bloc" id="confiance">
          <h2>La confiance n&apos;est pas une option</h2>
          <div className="confiance-grille">
            <div className="gage">
              <h3>Identité vérifiée</h3>
              <p>
                Chaque membre passe une vérification photo et vidéo avant de rencontrer
                qui que ce soit. Sans exception.
              </p>
            </div>
            <div className="gage">
              <h3>Vos données en Europe</h3>
              <p>
                Hébergement en Union européenne, conformité RGPD, suppression de compte en
                un clic. Vos conversations avec Irisia ne sont jamais vendues, à personne.
              </p>
            </div>
            <div className="gage">
              <h3>Jamais de publicité</h3>
              <p>
                Notre modèle est simple&nbsp;: un service que l&apos;on choisit de payer,
                pas une attention que l&apos;on revend. Votre temps sur IRISIA se compte
                en minutes, pas en heures.
              </p>
            </div>
          </div>
        </section>

        {/* ═════════ APPEL FINAL ═════════ */}
        <section className="bloc final">
          <h2>Votre prochaine rencontre pourrait être la bonne.</h2>
          <div className="actions">
            <Link className="bouton" href="/inscription">Créer mon compte</Link>
          </div>
        </section>

        <footer className="site">
          <span>© 2026 IRISIA — fait avec soin, en France.</span>
          <span>
            <Link href="/confidentialite">Confidentialité</Link> ·{" "}
            <Link href="/mentions-legales">Mentions légales</Link>
          </span>
        </footer>
      </div>
    </>
  );
}
