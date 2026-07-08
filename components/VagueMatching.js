"use client";
import { useState } from "react";

export default function VagueMatching() {
  const [resultat, setResultat] = useState("");
  const [occupe, setOccupe] = useState(false);

  async function lancer() {
    setOccupe(true);
    setResultat("Irisia examine les membres prêts…");
    try {
      const rep = await fetch("/api/admin/matching", { method: "POST" });
      const json = await rep.json();
      setResultat(
        rep.ok
          ? `${json.membres_examines} membre(s) examiné(s) → ${json.presentations_creees} présentation(s) créée(s).`
          : json.erreur || "Une erreur est survenue."
      );
    } catch {
      setResultat("Une erreur est survenue.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div style={{ margin: "18px 0 26px" }}>
      <button className="bouton" onClick={lancer} disabled={occupe}>
        🌿 Lancer une vague de présentations
      </button>
      {resultat && <p style={{ marginTop: "10px", color: "var(--brume)" }}>{resultat}</p>}
    </div>
  );
}
