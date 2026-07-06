"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Inscription() {
  const router = useRouter();
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);

    const f = e.target;
    const donnees = {
      prenom: f.prenom.value,
      email: f.email.value,
      motDePasse: f.motDePasse.value,
      dateNaissance: f.dateNaissance.value,
      genre: f.genre.value,
      consentement: f.consentement.checked,
    };

    try {
      const rep = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
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
        <h1>Bienvenue.</h1>
        <p className="sous-titre">
          Créez votre compte&nbsp;— Irisia vous attend juste après.
        </p>

        {erreur && <p className="message-erreur" role="alert">{erreur}</p>}

        <form onSubmit={envoyer}>
          <div className="champ">
            <label htmlFor="prenom">Votre prénom</label>
            <input id="prenom" name="prenom" type="text" placeholder="Jérôme" required autoComplete="given-name" />
          </div>

          <div className="champ">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="email" type="email" placeholder="votre@email.fr" required autoComplete="email" />
          </div>

          <div className="champ">
            <label htmlFor="motDePasse">Mot de passe</label>
            <input id="motDePasse" name="motDePasse" type="password" minLength={8} required autoComplete="new-password" />
            <p className="aide">8 caractères minimum.</p>
          </div>

          <div className="champ">
            <label htmlFor="dateNaissance">Date de naissance</label>
            <input id="dateNaissance" name="dateNaissance" type="date" required autoComplete="bday" />
            <p className="aide">IRISIA est réservé aux personnes majeures.</p>
          </div>

          <div className="champ">
            <label htmlFor="genre">Vous êtes</label>
            <select id="genre" name="genre" defaultValue="">
              <option value="" disabled>Choisissez…</option>
              <option value="femme">Une femme</option>
              <option value="homme">Un homme</option>
              <option value="autre">Autre / je préfère le dire à Irisia</option>
            </select>
          </div>

          <label className="champ-consentement">
            <input type="checkbox" name="consentement" required />
            <span>
              J&apos;accepte que mes informations soient utilisées uniquement pour le
              service IRISIA, comme décrit dans la{" "}
              <Link href="/confidentialite">politique de confidentialité</Link>.
            </span>
          </label>

          <button className="bouton large" type="submit" disabled={enCours}>
            {enCours ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        <p className="bascule-auth">
          Déjà membre&nbsp;? <Link href="/connexion">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
