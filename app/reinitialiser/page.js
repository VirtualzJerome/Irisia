"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Reinitialiser() {
  const router = useRouter();
  const [jeton, setJeton] = useState("");
  const [erreur, setErreur] = useState("");
  const [fait, setFait] = useState(false);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setJeton(params.get("jeton") || "");
  }, []);

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    const mdp = e.target.motDePasse.value;
    const confirmation = e.target.confirmation.value;
    if (mdp !== confirmation) return setErreur("Les deux mots de passe ne correspondent pas.");
    setOccupe(true);
    try {
      const rep = await fetch("/api/mot-de-passe/reinitialiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jeton, motDePasse: mdp }),
      });
      const json = await rep.json();
      if (!rep.ok) {
        setErreur(json.erreur || "Une erreur est survenue.");
        setOccupe(false);
        return;
      }
      setFait(true);
      setTimeout(() => router.push("/connexion"), 2500);
    } catch {
      setErreur("Une erreur est survenue. Réessayez.");
      setOccupe(false);
    }
  }

  return (
    <main className="page-auth">
      <div className="carte-auth">
        <h1>Nouveau mot de passe</h1>
        {fait ? (
          <p className="sous-titre" style={{ marginTop: "10px" }}>
            C&apos;est fait — votre nouveau mot de passe est en place. 🌿
            Direction la <Link href="/connexion">connexion</Link>…
          </p>
        ) : (
          <>
            <p className="sous-titre">Choisissez votre nouveau mot de passe (8 caractères minimum).</p>
            {erreur && <p className="message-erreur" role="alert">{erreur}</p>}
            <form onSubmit={envoyer}>
              <div className="champ">
                <label htmlFor="motDePasse">Nouveau mot de passe</label>
                <input id="motDePasse" name="motDePasse" type="password" minLength={8} required autoComplete="new-password" />
              </div>
              <div className="champ">
                <label htmlFor="confirmation">Confirmez-le</label>
                <input id="confirmation" name="confirmation" type="password" minLength={8} required autoComplete="new-password" />
              </div>
              <button className="bouton large" type="submit" disabled={occupe || !jeton}>
                {occupe ? "Enregistrement…" : "Enregistrer"}
              </button>
              {!jeton && <p className="aide" style={{ marginTop: "10px" }}>Lien incomplet — repassez par l&apos;email d&apos;Irisia.</p>}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
