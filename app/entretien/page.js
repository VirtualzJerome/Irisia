"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Entretien() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState("");
  const [attente, setAttente] = useState(false);
  const [termine, setTermine] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const finListe = useRef(null);

  // Charger (ou ouvrir) l'entretien
  useEffect(() => {
    (async () => {
      try {
        const rep = await fetch("/api/entretien");
        if (rep.status === 401) {
          router.push("/connexion");
          return;
        }
        const json = await rep.json();
        setMessages(json.messages || []);
        setTermine(!!json.termine);
      } catch {
        setErreur("Impossible de joindre Irisia. Rechargez la page.");
      } finally {
        setChargement(false);
      }
    })();
  }, [router]);

  // Toujours défiler vers le dernier message
  useEffect(() => {
    finListe.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, attente]);

  async function envoyer(e) {
    e.preventDefault();
    const texte = saisie.trim();
    if (!texte || attente || termine) return;

    setMessages((m) => [...m, { role: "user", contenu: texte }]);
    setSaisie("");
    setAttente(true);
    setErreur("");

    try {
      const rep = await fetch("/api/entretien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: texte }),
      });
      const json = await rep.json();
      if (!rep.ok) {
        setErreur(json.erreur || "Une erreur est survenue.");
      } else {
        setMessages((m) => [...m, { role: "assistant", contenu: json.reponse }]);
        if (json.termine) setTermine(true);
      }
    } catch {
      setErreur("Irisia est momentanément injoignable. Réessayez.");
    } finally {
      setAttente(false);
    }
  }

  return (
    <div className="chat-page">
      <header className="chat-entete">
        <Link className="marque" href="/espace" aria-label="Retour à mon espace">
          <svg width="26" height="26" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <ellipse cx="15" cy="15" rx="13" ry="8.2" stroke="#8F79EA" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="4.6" stroke="#D8B45C" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="1.5" fill="#EFEAF6" />
          </svg>
          IRISIA
        </Link>
        <span className="chat-statut">
          {termine ? "Entretien terminé" : "Votre entretien avec Irisia"}
        </span>
        <Link className="lien-nav" href="/espace">Mon espace</Link>
      </header>

      <main className="chat-fil" aria-live="polite">
        {chargement && <p className="chat-info">Irisia arrive…</p>}

        {messages.map((m, i) => (
          <div key={i} className={"bulle " + (m.role === "user" ? "moi" : "irisia")}>
            {m.role === "assistant" && <span className="bulle-nom">Irisia</span>}
            {m.contenu.split("\n").map((ligne, j) =>
              ligne.trim() === "" ? <br key={j} /> : <p key={j}>{ligne}</p>
            )}
          </div>
        ))}

        {attente && (
          <div className="bulle irisia">
            <span className="bulle-nom">Irisia</span>
            <p className="ecrit">écrit<span>.</span><span>.</span><span>.</span></p>
          </div>
        )}

        {termine && (
          <div className="chat-fin">
            <p>
              🌿 Votre entretien est terminé. Irisia vous connaît maintenant —
              elle gardera précieusement ce que vous lui avez confié pour vous
              présenter la bonne personne.
            </p>
            <Link className="bouton" href="/espace">Retourner à mon espace</Link>
          </div>
        )}

        {erreur && <p className="message-erreur">{erreur}</p>}
        <div ref={finListe} />
      </main>

      {!termine && !chargement && (
        <form className="chat-saisie" onSubmit={envoyer}>
          <input
            type="text"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Répondez à Irisia…"
            maxLength={1500}
            autoFocus
            aria-label="Votre message à Irisia"
          />
          <button className="bouton" type="submit" disabled={attente || !saisie.trim()}>
            Envoyer
          </button>
        </form>
      )}
    </div>
  );
}
