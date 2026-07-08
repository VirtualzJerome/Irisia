"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignalerMembre({ prenom }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);

  async function signaler() {
    setOccupe(true);
    setErreur("");
    try {
      const rep = await fetch("/api/signalement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      const json = await rep.json();
      if (!rep.ok) {
        setErreur(json.erreur || "Une erreur est survenue.");
        setOccupe(false);
        return;
      }
      router.push("/espace");
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue.");
      setOccupe(false);
    }
  }

  if (!ouvert)
    return (
      <p className="signaler-lien">
        Un problème avec {prenom}&nbsp;?{" "}
        <button className="lien-discret" onClick={() => setOuvert(true)}>Signaler</button>
      </p>
    );

  return (
    <div className="signaler-boite">
      <p>
        Décrivez le problème — votre signalement ferme immédiatement cette présentation,
        vous ne serez jamais remis en relation, et notre équipe examinera le profil.
      </p>
      {erreur && <p className="message-erreur">{erreur}</p>}
      <textarea rows={3} maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)}
        placeholder="Comportement déplacé, photos trompeuses, demande d'argent…" />
      <div className="pres-boutons">
        <button className="bouton refus" onClick={signaler} disabled={occupe || motif.trim().length < 5}>
          {occupe ? "Envoi…" : "Signaler et fermer"}
        </button>
        <button className="lien-discret" onClick={() => setOuvert(false)} disabled={occupe}>Annuler</button>
      </div>
    </div>
  );
}
