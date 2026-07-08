"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Compte() {
  const router = useRouter();
  const [portraitResume, setPortraitResume] = useState(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rep = await fetch("/api/compte/export");
        if (rep.status === 401) return router.push("/connexion");
        const json = await rep.json();
        const p = json?.profil?.portrait;
        const portrait = typeof p === "string" ? JSON.parse(p) : p;
        if (portrait?.resume) setPortraitResume(portrait.resume);
      } catch {}
    })();
  }, [router]);

  async function supprimer(e) {
    e.preventDefault();
    if (!confirme) return setErreur("Cochez la case de confirmation.");
    setOccupe(true);
    setErreur("");
    try {
      const rep = await fetch("/api/compte", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motDePasse }),
      });
      const json = await rep.json();
      if (!rep.ok) {
        setErreur(json.erreur || "Une erreur est survenue.");
        setOccupe(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Réessayez.");
      setOccupe(false);
    }
  }

  return (
    <div className="wrap">
      <header className="site">
        <Link className="marque" href="/espace">
          <svg width="26" height="26" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <ellipse cx="15" cy="15" rx="13" ry="8.2" stroke="#8F79EA" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="4.6" stroke="#D8B45C" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="1.5" fill="#EFEAF6" />
          </svg>
          IRISIA
        </Link>
        <nav className="nav-droite">
          <Link className="lien-nav" href="/espace">Mon espace</Link>
        </nav>
      </header>

      <main className="espace">
        <h1 className="bienvenue">Mon compte</h1>
        <p className="sous-bienvenue">Vos données vous appartiennent — c&apos;est ici que ça se prouve.</p>

        <div className="parcours">
          {portraitResume && (
            <div className="jalon fait">
              <span className="pastille">🌿</span>
              <div>
                <h3>Ce qu&apos;Irisia retient de vous</h3>
                <p style={{ fontStyle: "italic" }}>&laquo;&nbsp;{portraitResume}&nbsp;&raquo;</p>
              </div>
            </div>
          )}

          <div className="jalon">
            <span className="pastille">📦</span>
            <div>
              <h3>Télécharger mes données</h3>
              <p>
                Votre profil, votre entretien avec Irisia, vos présentations et vos
                conversations — dans un fichier lisible qui vous appartient.
              </p>
              <p style={{ marginTop: "14px" }}>
                <a className="bouton" href="/api/compte/export" download>Télécharger (JSON)</a>
              </p>
            </div>
          </div>

          <div className="jalon zone-danger">
            <span className="pastille">⚠️</span>
            <div>
              <h3>Supprimer mon compte</h3>
              <p>
                Définitif et immédiat : profil, photos, vidéo, entretien, présentations
                et conversations — tout est effacé, sans copie conservée.
              </p>
              {erreur && <p className="message-erreur" style={{ marginTop: "12px" }}>{erreur}</p>}
              <form onSubmit={supprimer} style={{ marginTop: "14px" }}>
                <div className="champ">
                  <label htmlFor="mdp">Votre mot de passe</label>
                  <input id="mdp" type="password" value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)} required autoComplete="current-password" />
                </div>
                <label className="champ-consentement">
                  <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
                  <span>Je comprends que cette action est irréversible.</span>
                </label>
                <button className="bouton refus" type="submit" disabled={occupe}>
                  {occupe ? "Suppression…" : "Supprimer définitivement mon compte"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
