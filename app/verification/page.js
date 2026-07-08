"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Verification() {
  const router = useRouter();
  const [etat, setEtat] = useState(null); // { statut, geste, photos, video }
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);

  // Caméra / enregistrement
  const videoDirect = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [compteARebours, setCompteARebours] = useState(0);
  const fluxRef = useRef(null);
  const enregistreurRef = useRef(null);

  async function charger() {
    try {
      const rep = await fetch("/api/verification");
      if (rep.status === 401) return router.push("/connexion");
      setEtat(await rep.json());
    } catch {
      setErreur("Impossible de charger votre dossier. Rechargez la page.");
    }
  }
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, []);

  // ── Photos ──
  async function envoyerPhoto(e) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setErreur(""); setOccupe(true);
    try {
      const compresse = await compresserImage(fichier);
      const forme = new FormData();
      forme.append("type", "photo");
      forme.append("fichier", compresse, "photo.jpg");
      const rep = await fetch("/api/verification", { method: "POST", body: forme });
      const json = await rep.json();
      if (!rep.ok) setErreur(json.erreur || "Envoi impossible.");
      await charger();
    } catch {
      setErreur("L'envoi de la photo a échoué. Réessayez.");
    } finally { setOccupe(false); }
  }

  function compresserImage(fichier) {
    // Réduit la photo côté navigateur (max 1200 px, JPEG) pour un envoi léger
    return new Promise((resoudre, rejeter) => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * ratio);
        c.height = Math.round(img.height * ratio);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resoudre(b) : rejeter(new Error())), "image/jpeg", 0.82);
      };
      img.onerror = () => rejeter(new Error());
      img.src = URL.createObjectURL(fichier);
    });
  }

  async function supprimerPhoto(id) {
    setOccupe(true);
    await fetch(`/api/media/${id}`, { method: "DELETE" });
    await charger();
    setOccupe(false);
  }

  // ── Vidéo ──
  async function allumerCamera() {
    setErreur("");
    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      fluxRef.current = flux;
      videoDirect.current.srcObject = flux;
      await videoDirect.current.play();
      setCameraActive(true);
    } catch {
      setErreur("Caméra inaccessible. Autorisez la caméra dans votre navigateur, ou utilisez l'envoi de fichier ci-dessous.");
    }
  }

  function eteindreCamera() {
    fluxRef.current?.getTracks().forEach((t) => t.stop());
    fluxRef.current = null;
    setCameraActive(false);
  }

  async function enregistrer() {
    if (!fluxRef.current) return;
    setErreur("");
    const morceaux = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const enr = new MediaRecorder(fluxRef.current, {
      mimeType: mime,
      videoBitsPerSecond: 900_000,
    });
    enregistreurRef.current = enr;
    enr.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
    enr.onstop = async () => {
      eteindreCamera();
      setEnregistrement(false);
      const blob = new Blob(morceaux, { type: "video/webm" });
      await envoyerVideo(blob);
    };
    enr.start();
    setEnregistrement(true);

    // 5 secondes, avec compte à rebours affiché
    for (let s = 5; s > 0; s--) {
      setCompteARebours(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCompteARebours(0);
    if (enr.state !== "inactive") enr.stop();
  }

  async function envoyerVideo(blob) {
    setOccupe(true);
    try {
      const forme = new FormData();
      forme.append("type", "video");
      forme.append("fichier", blob, "selfie.webm");
      const rep = await fetch("/api/verification", { method: "POST", body: forme });
      const json = await rep.json();
      if (!rep.ok) setErreur(json.erreur || "Envoi impossible.");
      await charger();
    } catch {
      setErreur("L'envoi de la vidéo a échoué. Réessayez.");
    } finally { setOccupe(false); }
  }

  async function envoyerVideoFichier(e) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (fichier) await envoyerVideo(fichier);
  }

  // ── Soumission ──
  async function soumettre() {
    setErreur(""); setOccupe(true);
    try {
      const forme = new FormData();
      forme.append("action", "soumettre");
      const rep = await fetch("/api/verification", { method: "POST", body: forme });
      const json = await rep.json();
      if (!rep.ok) setErreur(json.erreur || "Soumission impossible.");
      await charger();
    } finally { setOccupe(false); }
  }

  if (!etat) return <main className="page-verif"><p className="chat-info">Chargement de votre dossier…</p></main>;

  const verrouille = etat.statut === "EN_ATTENTE" || etat.statut === "VERIFIE";

  return (
    <main className="page-verif">
      <header className="chat-entete">
        <Link className="marque" href="/espace">
          <svg width="26" height="26" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <ellipse cx="15" cy="15" rx="13" ry="8.2" stroke="#8F79EA" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="4.6" stroke="#D8B45C" strokeWidth="1.6" />
            <circle cx="15" cy="15" r="1.5" fill="#EFEAF6" />
          </svg>
          IRISIA
        </Link>
        <span className="chat-statut">Vérification du profil</span>
        <Link className="lien-nav" href="/espace">Mon espace</Link>
      </header>

      {etat.statut === "VERIFIE" && (
        <div className="verif-bandeau ok">✅ Votre profil est vérifié. Merci de contribuer à une communauté sans faux profils.</div>
      )}
      {etat.statut === "EN_ATTENTE" && (
        <div className="verif-bandeau attente">🕰 Votre dossier est en cours d'examen par notre équipe. Vous serez prévenu très vite.</div>
      )}
      {etat.statut === "REFUSE" && (
        <div className="verif-bandeau refus">Votre précédent dossier n'a pas pu être validé (photos ou vidéo peu lisibles, ou geste non conforme). Recommencez ci-dessous — prenez votre temps, bonne lumière, visage bien visible.</div>
      )}

      {erreur && <p className="message-erreur">{erreur}</p>}

      {!verrouille && (
        <>
          {/* ── 1. PHOTOS ── */}
          <section className="verif-bloc">
            <h2>1. Vos photos <span className="verif-detail">(1 à 3 — elles seront aussi vos photos de profil)</span></h2>
            <div className="verif-photos">
              {etat.photos.map((p) => (
                <div className="verif-photo" key={p.id}>
                  <img src={`/api/media/${p.id}`} alt="Votre photo" />
                  <button className="verif-suppr" onClick={() => supprimerPhoto(p.id)} disabled={occupe} aria-label="Supprimer cette photo">✕</button>
                </div>
              ))}
              {etat.photos.length < 3 && (
                <label className="verif-ajout">
                  <input type="file" accept="image/*" onChange={envoyerPhoto} disabled={occupe} hidden />
                  <span>+ Ajouter une photo</span>
                </label>
              )}
            </div>
          </section>

          {/* ── 2. SELFIE VIDÉO ── */}
          <section className="verif-bloc">
            <h2>2. Votre selfie vidéo <span className="verif-detail">(5 secondes, la preuve que vous êtes réel)</span></h2>
            <div className="verif-geste">
              <span>Pendant l'enregistrement&nbsp;:</span>
              <strong>{etat.geste}</strong>
            </div>

            {etat.video && !cameraActive && (
              <div className="verif-video-ok">
                <video src={`/api/media/${etat.video}`} controls playsInline />
                <p>✅ Selfie enregistré. Vous pouvez le refaire si besoin.</p>
              </div>
            )}

            <div className="verif-camera">
              <video ref={videoDirect} muted playsInline style={{ display: cameraActive ? "block" : "none" }} />
              {enregistrement && <div className="verif-rec">● REC {compteARebours}s</div>}
            </div>

            <div className="verif-actions">
              {!cameraActive && (
                <button className="bouton" onClick={allumerCamera} disabled={occupe}>
                  {etat.video ? "Refaire le selfie" : "Allumer la caméra"}
                </button>
              )}
              {cameraActive && !enregistrement && (
                <>
                  <button className="bouton" onClick={enregistrer}>● Enregistrer (5 s)</button>
                  <button className="lien-discret" onClick={eteindreCamera}>Annuler</button>
                </>
              )}
              {!cameraActive && (
                <label className="lien-discret" style={{ cursor: "pointer" }}>
                  <input type="file" accept="video/*" capture="user" onChange={envoyerVideoFichier} disabled={occupe} hidden />
                  Ou envoyer une vidéo depuis l'appareil
                </label>
              )}
            </div>
          </section>

          {/* ── 3. SOUMETTRE ── */}
          <section className="verif-bloc">
            <button
              className="bouton large"
              onClick={soumettre}
              disabled={occupe || etat.photos.length < 1 || !etat.video}
            >
              {occupe ? "Un instant…" : "Envoyer pour vérification"}
            </button>
            <p className="verif-rgpd">
              Vos photos et votre vidéo servent uniquement à vérifier votre profil et à le présenter
              aux membres qu'Irisia vous propose. Elles ne sont jamais partagées ailleurs, et sont
              supprimées avec votre compte.
            </p>
          </section>
        </>
      )}

      <p style={{ padding: "20px 4px" }}>
        <Link href="/espace">← Retour à mon espace</Link>
      </p>
    </main>
  );
}
