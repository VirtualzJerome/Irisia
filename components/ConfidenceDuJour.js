"use client";
import { useEffect, useState } from "react";

export default function ConfidenceDuJour() {
  const [question, setQuestion] = useState(null);
  const [reponse, setReponse] = useState("");
  const [etat, setEtat] = useState("chargement"); // chargement | prete | merci | rien
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/confidence")
      .then((r) => r.json())
      .then((j) => {
        if (j.question) { setQuestion(j.question); setEtat("prete"); }
        else setEtat("rien");
      })
      .catch(() => setEtat("rien"));
  }, []);

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    try {
      const rep = await fetch("/api/confidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, reponse }),
      });
      const json = await rep.json();
      if (!rep.ok) setErreur(json.erreur || "Une erreur est survenue.");
      else setEtat("merci");
    } catch {
      setErreur("Une erreur est survenue. Réessayez.");
    }
  }

  if (etat === "chargement" || etat === "rien") return null;

  return (
    <div className="parcours" style={{ marginTop: "18px" }}>
      <div className="jalon confidence">
        <span className="pastille">💭</span>
        <div style={{ flex: 1 }}>
          <h3>La confidence du jour</h3>
          {etat === "merci" ? (
            <p>Merci. Irisia a rangé votre réponse précieusement — chaque confidence affine ses recherches. À demain. 🌿</p>
          ) : (
            <>
              <p style={{ fontStyle: "italic" }}>&laquo;&nbsp;{question}&nbsp;&raquo;</p>
              {erreur && <p className="message-erreur" style={{ marginTop: "10px" }}>{erreur}</p>}
              <form onSubmit={envoyer} style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="text" value={reponse} maxLength={400}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Répondez avec vos mots…"
                  style={{ flex: "1 1 240px", background: "var(--nuit)", color: "var(--petale)",
                    border: "1px solid var(--nuit-3)", borderRadius: "12px", padding: "12px 14px", font: "inherit" }}
                />
                <button className="bouton" type="submit" disabled={!reponse.trim()}>Confier</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
