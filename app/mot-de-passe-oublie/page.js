"use client";

import { useState } from "react";
import Link from "next/link";

export default function MotDePasseOublie() {
  const [envoye, setEnvoye] = useState(false);
  const [occupe, setOccupe] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setOccupe(true);
    try {
      await fetch("/api/mot-de-passe/oublie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e.target.email.value }),
      });
    } catch {}
    setEnvoye(true);
  }

  return (
    <main className="page-auth">
      <div className="carte-auth">
        <h1>Mot de passe oublié</h1>
        {envoye ? (
          <>
            <p className="sous-titre" style={{ marginTop: "10px" }}>
              Si un compte existe avec cette adresse, Irisia vient de lui écrire.
              Ouvrez l&apos;email et suivez le lien — il est valable une heure.
            </p>
            <p className="bascule-auth"><Link href="/connexion">Retour à la connexion</Link></p>
          </>
        ) : (
          <>
            <p className="sous-titre">Indiquez votre adresse — Irisia vous enverra un lien sécurisé.</p>
            <form onSubmit={envoyer}>
              <div className="champ">
                <label htmlFor="email">Adresse e-mail</label>
                <input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <button className="bouton large" type="submit" disabled={occupe}>
                {occupe ? "Envoi…" : "Recevoir le lien"}
              </button>
            </form>
            <p className="bascule-auth"><Link href="/connexion">Retour à la connexion</Link></p>
          </>
        )}
      </div>
    </main>
  );
}
