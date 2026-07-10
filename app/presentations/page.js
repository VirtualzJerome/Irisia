"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COULEURS, OPTIONS_ENFANTS, OPTIONS_TABAC, etiquettePour } from "../../lib/options-profil";
import ChargeurIrisia from "../../components/ChargeurIrisia";
import SignalerMembre from "../../components/SignalerMembre";

export default function Presentations() {
  const router = useRouter();
  const [donnees, setDonnees] = useState(null); // { pret, manque, presentation }
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [declinEnCours, setDeclinEnCours] = useState(false);
  const [motif, setMotif] = useState("");
  const [motAvecOui, setMotAvecOui] = useState("");
  const [conseil, setConseil] = useState("");
  const [coachEnCours, setCoachEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  // ── Conversation ──
  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState("");
  const dernierId = useRef(0);
  const finListe = useRef(null);

  const charger = useCallback(async () => {
    try {
      const rep = await fetch("/api/presentations");
      if (rep.status === 401) return router.push("/connexion");
      setDonnees(await rep.json());
    } catch {
      setErreur("Impossible de joindre Irisia. Rechargez la page.");
    } finally {
      setChargement(false);
    }
  }, [router]);

  useEffect(() => { charger(); }, [charger]);

  const pres = donnees?.presentation;
  const mutuelle = !!pres?.mutuelle;

  // Sondage de la conversation toutes les 4 secondes quand elle est ouverte
  useEffect(() => {
    if (!mutuelle) return;
    let actif = true;
    async function tirer() {
      try {
        const rep = await fetch("/api/presentations/messages?apres=" + dernierId.current);
        const json = await rep.json();
        if (actif && json.messages?.length) {
          setMessages((m) => [...m, ...json.messages]);
          dernierId.current = json.messages[json.messages.length - 1].id;
        }
      } catch {}
    }
    tirer();
    const t = setInterval(tirer, 4000);
    return () => { actif = false; clearInterval(t); };
  }, [mutuelle]);

  useEffect(() => {
    finListe.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function repondre(reponse) {
    setOccupe(true);
    setErreur("");
    try {
      const rep = await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repondre", reponse, motif: motif.trim(), mot: motAvecOui.trim() }),
      });
      const json = await rep.json();
      if (!rep.ok) setErreur(json.erreur || "Une erreur est survenue.");
      else if (reponse === "DECLINE") {
        setDeclinEnCours(false);
        setMotif("");
        setDonnees({ pret: true, presentation: null });
      } else {
        setDonnees({ pret: true, presentation: json.presentation });
      }
    } catch {
      setErreur("Une erreur est survenue. Réessayez.");
    } finally {
      setOccupe(false);
    }
  }

  async function demanderConseil() {
    setCoachEnCours(true);
    try {
      const rep = await fetch("/api/presentations/coach", { method: "POST" });
      const json = await rep.json();
      setConseil(rep.ok ? json.conseil : json.erreur || "Irisia est momentanément indisponible.");
    } catch {
      setConseil("Irisia est momentanément indisponible.");
    } finally {
      setCoachEnCours(false);
    }
  }

  async function envoyerMessage(e) {
    e.preventDefault();
    const texte = saisie.trim();
    if (!texte) return;
    setSaisie("");
    try {
      const rep = await fetch("/api/presentations/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: texte }),
      });
      const json = await rep.json();
      if (rep.ok) {
        setMessages((m) => [...m, { id: json.id, de_moi: true, contenu: texte }]);
        dernierId.current = json.id;
      }
    } catch {}
  }

  function Entete({ statut }) {
    return (
      <header className="chat-entete">
        <Link className="marque" href="/espace" aria-label="Retour à mon espace">
          <svg width="26" height="26" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <ellipse cx="15" cy="15" rx="13" ry="8.2" stroke="#8F79EA" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="4.6" stroke="#D8B45C" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="1.5" fill="#EFEAF6" />
          </svg>
          IRISIA
        </Link>
        <span className="chat-statut">{statut}</span>
        <Link className="lien-nav" href="/espace">Mon espace</Link>
      </header>
    );
  }

  if (chargement)
    return (
      <div className="chat-page"><Entete statut="Vos présentations" />
        <main className="chat-fil"><ChargeurIrisia texte="Irisia consulte ses notes…" /></main>
      </div>
    );

  // ── Prérequis manquants ──
  if (donnees && donnees.pret === false)
    return (
      <div className="chat-page"><Entete statut="Vos présentations" />
        <main className="chat-fil">
          <div className="chat-fin">
            <p>
              Avant de vous présenter qui que ce soit, Irisia a besoin que votre
              parcours soit complet : {donnees.manque.includes("verification") && "vérification photo & vidéo"}
              {donnees.manque.length === 2 && " et "}
              {donnees.manque.includes("entretien") && "entretien avec Irisia"}.
            </p>
            <Link className="bouton" href="/espace">Compléter mon parcours</Link>
          </div>
        </main>
      </div>
    );

  // ── Pas de présentation : Irisia cherche ──
  if (!pres)
    return (
      <div className="chat-page"><Entete statut="Vos présentations" />
        <main className="chat-fil">
          <div className="chat-fin">
            <p className="recherche-titre">{donnees.en_pause ? "⏸️ Votre profil est en pause." : "🌿 Irisia cherche pour vous."}</p>
            <p>
              {donnees.en_pause
                ? "Irisia respecte vos saisons : elle ne cherche pas tant que la pause est active. Réactivez-la depuis votre profil quand le cœur vous en dira."
                : "Votre profil est complet — Irisia examine les membres vérifiés et ne vous présentera quelqu'un que lorsqu'elle y croira vraiment. C'est sa promesse : jamais de catalogue, jamais de présentation médiocre. Vous verrez la présentation apparaître ici même."}
            </p>
            <Link className="bouton" href="/espace">Retour à mon espace</Link>
          </div>
        </main>
      </div>
    );

  // ── Conversation ouverte (les deux ont dit oui) ──
  if (mutuelle)
    return (
      <div className="chat-page"><Entete statut={"Votre conversation avec " + pres.prenom} />
        <main className="chat-fil" aria-live="polite">
          <div className="bulle irisia">
            <span className="bulle-nom">Irisia</span>
            <p>
              {pres.prenom} et vous avez tous les deux dit oui. Je vous laisse — faites
              connaissance, prenez votre temps. Je croise les doigts pour vous deux. 🌿
            </p>
            {pres.brise_glace && (
              <p style={{ marginTop: "10px" }}>
                Pour briser la glace&nbsp;: {pres.brise_glace}
              </p>
            )}
          </div>
          {pres.son_mot && (
            <div className="bulle irisia">
              <span className="bulle-nom">Le mot de {pres.prenom}</span>
              <p>&laquo;&nbsp;{pres.son_mot}&nbsp;&raquo;</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={"bulle " + (m.de_moi ? "moi" : "irisia")}>
              {!m.de_moi && <span className="bulle-nom">{pres.prenom}</span>}
              <p>{m.contenu}</p>
            </div>
          ))}
          <SignalerMembre prenom={pres.prenom} />
          <div ref={finListe} />
        </main>
        {conseil && (
          <div className="conseil-prive" role="status">
            <p className="conseil-titre">🌿 Le conseil d&apos;Irisia — visible par vous seul·e</p>
            <p>{conseil}</p>
            <button type="button" className="lien-discret" onClick={() => setConseil("")}>Fermer</button>
          </div>
        )}
        <div className="barre-coach">
          <button type="button" className="lien-discret" onClick={demanderConseil} disabled={coachEnCours}>
            {coachEnCours ? "Irisia relit votre conversation…" : "🌿 Demander conseil à Irisia"}
          </button>
        </div>
        <form className="chat-saisie" onSubmit={envoyerMessage}>
          <input
            type="text" value={saisie} onChange={(e) => setSaisie(e.target.value)}
            placeholder={"Écrivez à " + pres.prenom + "…"} maxLength={2000} autoFocus
            aria-label={"Votre message à " + pres.prenom}
          />
          <button className="bouton" type="submit" disabled={!saisie.trim()}>Envoyer</button>
        </form>
      </div>
    );

  // ── La présentation ──
  return (
    <div className="chat-page"><Entete statut="Une présentation pour vous" />
      <main className="chat-fil">
        <div className="carte-presentation" style={{ "--accent": COULEURS[pres.profil?.couleur_accent] || COULEURS.iris }}>
          <p className="pres-eyebrow">Irisia vous présente</p>
          <h1 className="pres-nom">{pres.prenom}, {pres.age} ans <span className="badge-verifie">✓ Vérifié</span></h1>

          {pres.profil && (
            <div className="pres-pastilles">
              {pres.profil.ville && <span className="pastille-info">📍 {pres.profil.ville}</span>}
              {pres.profil.profession && <span className="pastille-info">💼 {pres.profil.profession}</span>}
              {pres.profil.taille_cm && <span className="pastille-info">📏 {pres.profil.taille_cm} cm</span>}
              {pres.profil.enfants && <span className="pastille-info">👶 {etiquettePour(OPTIONS_ENFANTS, pres.profil.enfants)}</span>}
              {pres.profil.tabac && <span className="pastille-info">🚭 {etiquettePour(OPTIONS_TABAC, pres.profil.tabac)}</span>}
            </div>
          )}

          {pres.photos.length > 0 && (
            <div className="pres-photos">
              {pres.photos.map((id) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={id} src={"/api/media/" + id} alt={"Photo de " + pres.prenom} />
              ))}
            </div>
          )}

          {(pres.communs || []).length > 0 && (
            <div className="pres-communs">
              <p className="q">✨ Vos points communs</p>
              <div className="pres-pastilles">
                {pres.communs.map((x) => (
                  <span className="pastille-passion" key={x} style={{ borderColor: "var(--accent)" }}>{x}</span>
                ))}
              </div>
            </div>
          )}

          {pres.son_mot && (
            <div className="pres-mot petit-mot">
              <p className="de">{pres.prenom} a dit oui — et vous laisse ce mot</p>
              <p className="texte">&laquo;&nbsp;{pres.son_mot}&nbsp;&raquo;</p>
            </div>
          )}

          {pres.profil?.bio && <p className="pres-bio">&laquo;&nbsp;{pres.profil.bio}&nbsp;&raquo;</p>}

          {(pres.profil?.passions || []).length > 0 && (
            <div className="pres-pastilles">
              {pres.profil.passions.map((x) => (
                <span className="pastille-passion" key={x} style={{ borderColor: "var(--accent)" }}>{x}</span>
              ))}
            </div>
          )}

          {(pres.profil?.reponses_prompts || []).map((r, i) => (
            <div className="pres-prompt" key={i}>
              <p className="q">{r.question}</p>
              <p className="r">{r.reponse}</p>
            </div>
          ))}

          <div className="pres-mot">
            <p className="de">Le mot d&apos;Irisia</p>
            <p className="texte">{pres.message_irisia}</p>
            <p className="signature">Irisia</p>
          </div>

          {erreur && <p className="message-erreur">{erreur}</p>}

          {pres.ma_reponse === "ACCEPTE" ? (
            <div className="pres-attente">
              <p>
                Vous avez dit oui. 🌿 {pres.elle_a_accepte
                  ? "La conversation s'ouvre…"
                  : `J'attends la réponse de ${pres.prenom} — vous serez parmi les premiers informés.`}
              </p>
            </div>
          ) : declinEnCours ? (
            <div className="pres-declin">
              <label htmlFor="motif">Dites à Irisia pourquoi (optionnel — cela l&apos;aide à mieux chercher) :</label>
              <textarea
                id="motif" value={motif} onChange={(e) => setMotif(e.target.value)}
                maxLength={500} rows={3} placeholder="Par exemple : trop loin de chez moi, rythme de vie trop différent…"
              />
              <div className="pres-boutons">
                <button className="bouton refus" onClick={() => repondre("DECLINE")} disabled={occupe}>
                  Confirmer — non merci
                </button>
                <button className="lien-discret" onClick={() => setDeclinEnCours(false)} disabled={occupe}>
                  Revenir
                </button>
              </div>
            </div>
          ) : (
            <div className="pres-accepter">
              <input
                type="text" maxLength={200} value={motAvecOui}
                onChange={(e) => setMotAvecOui(e.target.value)}
                placeholder={"Un petit mot avec votre oui ? (optionnel)"}
                className="champ-petit-mot"
              />
            <div className="pres-boutons">
              <button className="bouton" onClick={() => repondre("ACCEPTE")} disabled={occupe}>
                🌿 Rencontrer {pres.prenom}
              </button>
              <button className="bouton refus" onClick={() => setDeclinEnCours(true)} disabled={occupe}>
                Décliner
              </button>
            </div>
            </div>
          )}
          <SignalerMembre prenom={pres.prenom} />
        </div>
      </main>
    </div>
  );
}
