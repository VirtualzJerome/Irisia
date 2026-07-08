"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PASSIONS, MAX_PASSIONS, PROMPTS, MAX_PROMPTS, LONGUEUR_MAX_REPONSE,
  COULEURS, OPTIONS_ENFANTS, OPTIONS_SOUHAIT_ENFANTS, OPTIONS_TABAC,
  etiquettePour,
} from "../../lib/options-profil";

export default function Profil() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [entretienFait, setEntretienFait] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [p, setP] = useState(null); // le profil éditable
  const [completude, setCompletude] = useState(0);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [bioEnCours, setBioEnCours] = useState(false);
  const [apercu, setApercu] = useState(false);
  const fichierRef = useRef(null);

  useEffect(() => {
    (async () => {
      const rep = await fetch("/api/profil");
      if (rep.status === 401) return router.push("/connexion");
      const json = await rep.json();
      setPrenom(json.prenom);
      setEntretienFait(json.entretien_termine);
      setPhotos(json.photos);
      setP(json.profil);
      setCompletude(json.completude);
    })().catch(() => setErreur("Impossible de charger votre profil. Rechargez la page."));
  }, [router]);

  function champ(nom, valeur) {
    setP((avant) => ({ ...avant, [nom]: valeur }));
  }

  function basculerPassion(nom) {
    const actuelles = p.passions || [];
    if (actuelles.includes(nom)) champ("passions", actuelles.filter((x) => x !== nom));
    else if (actuelles.length < MAX_PASSIONS) champ("passions", [...actuelles, nom]);
  }

  function majPrompt(i, cle, valeur) {
    const liste = [...(p.reponses_prompts || [])];
    liste[i] = { ...liste[i], [cle]: valeur };
    champ("reponses_prompts", liste);
  }
  function ajouterPrompt() {
    const utilisees = (p.reponses_prompts || []).map((r) => r.question);
    const libre = PROMPTS.find((q) => !utilisees.includes(q));
    if (libre) champ("reponses_prompts", [...(p.reponses_prompts || []), { question: libre, reponse: "" }]);
  }
  function retirerPrompt(i) {
    champ("reponses_prompts", (p.reponses_prompts || []).filter((_, j) => j !== i));
  }

  async function demanderBio() {
    setBioEnCours(true);
    setErreur("");
    try {
      const rep = await fetch("/api/profil/bio", { method: "POST" });
      const json = await rep.json();
      if (!rep.ok) setErreur(json.erreur || "Une erreur est survenue.");
      else champ("bio", json.bio);
    } catch {
      setErreur("Irisia est momentanément indisponible.");
    } finally {
      setBioEnCours(false);
    }
  }

  async function enregistrer() {
    setOccupe(true);
    setErreur("");
    setMessage("");
    try {
      const rep = await fetch("/api/profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ville: p.ville, profession: p.profession, taille_cm: p.taille_cm,
          enfants: p.enfants, souhait_enfants: p.souhait_enfants, tabac: p.tabac,
          passions: p.passions || [],
          reponses_prompts: (p.reponses_prompts || []).filter((r) => r.reponse?.trim()),
          bio: p.bio, couleur_accent: p.couleur_accent,
        }),
      });
      const json = await rep.json();
      if (!rep.ok) setErreur(json.erreur || "Une erreur est survenue.");
      else {
        setP(json.profil);
        setCompletude(json.completude);
        setMessage("Profil enregistré. ✓");
        setTimeout(() => setMessage(""), 3500);
      }
    } catch {
      setErreur("Une erreur est survenue. Réessayez.");
    } finally {
      setOccupe(false);
    }
  }

  async function ajouterPhoto(e) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    if (fichier.size > 3 * 1024 * 1024) return setErreur("Photo trop lourde (3 Mo maximum).");
    setErreur("");
    const donnees = new FormData();
    donnees.append("fichier", fichier);
    const rep = await fetch("/api/profil/photos", { method: "POST", body: donnees });
    const json = await rep.json();
    if (!rep.ok) setErreur(json.erreur || "Une erreur est survenue.");
    else setPhotos((av) => [...av, json.id]);
  }

  async function retirerPhoto(id) {
    const rep = await fetch("/api/profil/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await rep.json();
    if (!rep.ok) setErreur(json.erreur || "Une erreur est survenue.");
    else setPhotos((av) => av.filter((x) => x !== id));
  }

  if (!p)
    return (
      <div className="wrap"><main className="espace"><p className="chat-info">Chargement de votre profil…</p></main></div>
    );

  const accent = COULEURS[p.couleur_accent] || COULEURS.iris;

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

      <main className="espace profil-page">
        <h1 className="bienvenue">Mon profil</h1>
        <p className="sous-bienvenue">
          Ce que les personnes qu&apos;Irisia vous présentera verront de vous. Faites-vous plaisir.
        </p>

        <div className="jauge" role="progressbar" aria-valuenow={completude} aria-valuemin={0} aria-valuemax={100}>
          <div className="jauge-barre" style={{ width: completude + "%", background: accent }} />
          <span className="jauge-texte">Profil complet à {completude}&nbsp;%</span>
        </div>

        {erreur && <p className="message-erreur">{erreur}</p>}
        {message && <p className="message-ok" role="status">{message}</p>}

        {/* ── Photos ── */}
        <section className="bloc-profil">
          <h2>Mes photos <span className="compteur">{photos.length}/6</span></h2>
          <div className="photo-grille">
            {photos.map((id) => (
              <div className="photo-cellule" key={id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={"/api/media/" + id} alt="Photo de profil" />
                <button type="button" className="photo-retirer" aria-label="Retirer cette photo"
                  onClick={() => retirerPhoto(id)}>✕</button>
              </div>
            ))}
            {photos.length < 6 && (
              <button type="button" className="photo-ajouter" onClick={() => fichierRef.current?.click()}>
                + Ajouter
              </button>
            )}
          </div>
          <input ref={fichierRef} type="file" accept="image/*" onChange={ajouterPhoto} hidden />
        </section>

        {/* ── Essentiels ── */}
        <section className="bloc-profil">
          <h2>Les essentiels</h2>
          <div className="grille-champs">
            <div className="champ">
              <label htmlFor="ville">Ma ville</label>
              <input id="ville" type="text" maxLength={60} value={p.ville || ""} placeholder="Metz"
                onChange={(e) => champ("ville", e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="profession">Ma profession</label>
              <input id="profession" type="text" maxLength={60} value={p.profession || ""} placeholder="Infirmier"
                onChange={(e) => champ("profession", e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="taille">Ma taille (cm)</label>
              <input id="taille" type="number" min={120} max={230} value={p.taille_cm || ""}
                onChange={(e) => champ("taille_cm", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="champ">
              <label htmlFor="enfants">Enfants</label>
              <select id="enfants" value={p.enfants || ""} onChange={(e) => champ("enfants", e.target.value || null)}>
                <option value="">—</option>
                {OPTIONS_ENFANTS.map((o) => <option key={o.valeur} value={o.valeur}>{o.etiquette}</option>)}
              </select>
            </div>
            <div className="champ">
              <label htmlFor="souhait">Et pour la suite ?</label>
              <select id="souhait" value={p.souhait_enfants || ""} onChange={(e) => champ("souhait_enfants", e.target.value || null)}>
                <option value="">—</option>
                {OPTIONS_SOUHAIT_ENFANTS.map((o) => <option key={o.valeur} value={o.valeur}>{o.etiquette}</option>)}
              </select>
            </div>
            <div className="champ">
              <label htmlFor="tabac">Tabac</label>
              <select id="tabac" value={p.tabac || ""} onChange={(e) => champ("tabac", e.target.value || null)}>
                <option value="">—</option>
                {OPTIONS_TABAC.map((o) => <option key={o.valeur} value={o.valeur}>{o.etiquette}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Passions ── */}
        <section className="bloc-profil">
          <h2>Mes passions <span className="compteur">{(p.passions || []).length}/{MAX_PASSIONS}</span></h2>
          <div className="puces">
            {PASSIONS.map((nom) => {
              const active = (p.passions || []).includes(nom);
              const pleine = (p.passions || []).length >= MAX_PASSIONS;
              return (
                <button key={nom} type="button"
                  className={"puce" + (active ? " active" : "")}
                  style={active ? { borderColor: accent, color: accent } : undefined}
                  disabled={!active && pleine}
                  onClick={() => basculerPassion(nom)}>
                  {nom}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Questions de personnalité ── */}
        <section className="bloc-profil">
          <h2>Trois choses à savoir <span className="compteur">{(p.reponses_prompts || []).length}/{MAX_PROMPTS}</span></h2>
          {(p.reponses_prompts || []).map((r, i) => (
            <div className="carte-prompt" key={i}>
              <div className="prompt-entete">
                <select value={r.question} onChange={(e) => majPrompt(i, "question", e.target.value)}>
                  {PROMPTS.filter((q) => q === r.question || !(p.reponses_prompts || []).some((x) => x.question === q))
                    .map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
                <button type="button" className="lien-discret" onClick={() => retirerPrompt(i)}>Retirer</button>
              </div>
              <textarea rows={2} maxLength={LONGUEUR_MAX_REPONSE} value={r.reponse || ""}
                placeholder="Votre réponse, avec vos mots…"
                onChange={(e) => majPrompt(i, "reponse", e.target.value)} />
            </div>
          ))}
          {(p.reponses_prompts || []).length < MAX_PROMPTS && (
            <button type="button" className="bouton refus" onClick={ajouterPrompt}>+ Ajouter une question</button>
          )}
        </section>

        {/* ── Bio ── */}
        <section className="bloc-profil">
          <h2>Ma bio</h2>
          <p className="aide-section">
            Le syndrome de la page blanche&nbsp;? Irisia peut l&apos;écrire pour vous, à partir de votre entretien —
            vous la retouchez ensuite.
          </p>
          <textarea rows={3} maxLength={300} value={p.bio || ""}
            placeholder="Quelques phrases qui vous ressemblent…"
            onChange={(e) => champ("bio", e.target.value)} />
          <button type="button" className="bouton" onClick={demanderBio}
            disabled={bioEnCours || !entretienFait}
            title={entretienFait ? "" : "Terminez d'abord votre entretien avec Irisia"}>
            {bioEnCours ? "Irisia écrit…" : "✨ Demander ma bio à Irisia"}
          </button>
        </section>

        {/* ── Couleur ── */}
        <section className="bloc-profil">
          <h2>Ma couleur</h2>
          <p className="aide-section">Elle habillera votre carte quand Irisia vous présentera.</p>
          <div className="nuancier">
            {Object.entries(COULEURS).map(([nom, hex]) => (
              <button key={nom} type="button"
                className={"nuance" + (p.couleur_accent === nom ? " active" : "")}
                style={{ background: hex }}
                aria-label={"Couleur " + nom}
                onClick={() => champ("couleur_accent", nom)} />
            ))}
          </div>
        </section>

        <div className="barre-actions">
          <button className="bouton" onClick={enregistrer} disabled={occupe}>
            {occupe ? "Enregistrement…" : "Enregistrer mon profil"}
          </button>
          <button className="bouton refus" type="button" onClick={() => setApercu(!apercu)}>
            {apercu ? "Fermer l'aperçu" : "👁 Voir ma carte"}
          </button>
        </div>

        {/* ── Aperçu : ma carte telle que les autres la verront ── */}
        {apercu && (
          <div className="carte-presentation" style={{ "--accent": accent, marginTop: "26px" }}>
            <p className="pres-eyebrow" style={{ color: accent }}>Irisia vous présente</p>
            <h1 className="pres-nom">{prenom} <span className="badge-verifie">✓ Vérifié</span></h1>
            <div className="pres-pastilles">
              {p.ville && <span className="pastille-info">📍 {p.ville}</span>}
              {p.profession && <span className="pastille-info">💼 {p.profession}</span>}
              {p.taille_cm && <span className="pastille-info">📏 {p.taille_cm} cm</span>}
              {p.enfants && <span className="pastille-info">👶 {etiquettePour(OPTIONS_ENFANTS, p.enfants)}</span>}
              {p.tabac && <span className="pastille-info">🚭 {etiquettePour(OPTIONS_TABAC, p.tabac)}</span>}
            </div>
            {photos.length > 0 && (
              <div className="pres-photos">
                {photos.slice(0, 3).map((id) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={id} src={"/api/media/" + id} alt="" />
                ))}
              </div>
            )}
            {p.bio && <p className="pres-bio">&laquo;&nbsp;{p.bio}&nbsp;&raquo;</p>}
            {(p.passions || []).length > 0 && (
              <div className="pres-pastilles">
                {p.passions.map((x) => <span className="pastille-passion" key={x} style={{ borderColor: accent }}>{x}</span>)}
              </div>
            )}
            {(p.reponses_prompts || []).filter((r) => r.reponse?.trim()).map((r, i) => (
              <div className="pres-prompt" key={i}>
                <p className="q">{r.question}</p>
                <p className="r">{r.reponse}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
