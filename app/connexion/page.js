"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Connexion() {
  const router = useRouter();
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    const f = e.target;
    try {
      const rep = await fetch("/api/connexion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email.value, motDePasse: f.motDePasse.value }),
      });
      const json = await rep.json();
      if (!rep.ok) {
        setErreur(json.erreur || "Une erreur est survenue.");
        setEnCours(false);
        return;
      }
      router.push("/espace");
      router.refresh();
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
      setEnCours(false);
    }
  }

  return (
    <main className="page-auth">
      <div className="carte-auth">
        <h1>Bon retour.</h1>
        <p className="sous-titre">Irisia vous a gardé votre place.</p>

        {erreur && <p className="message-erreur" role="alert">{erreur}</p>}

        <form onSubmit={envoyer}>
          <div className="champ">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="champ">
            <label htmlFor="motDePasse">Mot de passe</label>
            <input id="motDePasse" name="motDePasse" type="password" required autoComplete="current-password" />
          </div>
          <button className="bouton large" type="submit" disabled={enCours}>
            {enCours ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="bascule-auth" style={{ marginTop: "14px" }}>
          <Link href="/mot-de-passe-oublie">Mot de passe oublié&nbsp;?</Link>
        </p>
        <p className="bascule-auth">
          Pas encore de compte&nbsp;? <Link href="/inscription">Créer mon compte</Link>
        </p>
      </div>
    </main>
  );
}
