import Link from "next/link";
import { redirect } from "next/navigation";
import { lireSession } from "../../lib/session";
import { trouverParId, listerEnAttente, listerMedias, listerSignalements, statistiques } from "../../lib/db";
import { estAdmin } from "../../lib/admin";
import DecisionAdmin from "../../components/DecisionAdmin";
import VagueMatching from "../../components/VagueMatching";
import TraiterSignalement from "../../components/TraiterSignalement";

export const metadata = { title: "Administration — IRISIA" };
export const dynamic = "force-dynamic";

function age(d) {
  const n = new Date(d), a = new Date();
  let x = a.getFullYear() - n.getFullYear();
  if (a.getMonth() < n.getMonth() || (a.getMonth() === n.getMonth() && a.getDate() < n.getDate())) x--;
  return x;
}

export default async function Admin() {
  const session = await lireSession();
  if (!session) redirect("/connexion");
  const moi = await trouverParId(session.userId);
  if (!moi || !estAdmin(moi.email)) redirect("/espace");

  const stats = await statistiques();
  const enAttente = await listerEnAttente();
  const signalements = await listerSignalements();
  const dossiers = await Promise.all(
    enAttente.map(async (u) => ({ ...u, medias: await listerMedias(u.id) }))
  );

  return (
    <div className="wrap">
      <header className="site">
        <Link className="marque" href="/espace">IRISIA — Administration</Link>
        <Link className="lien-nav" href="/espace">Mon espace</Link>
      </header>

      <main className="espace">
        <h1 className="bienvenue">Vérifications en attente</h1>
        <p className="sous-bienvenue">
          Pour chaque dossier : comparez le visage de la vidéo aux photos, et vérifiez que
          le geste demandé est bien exécuté. Au moindre doute, refusez — le membre pourra recommencer.
        </p>
        <div className="stats-grille">
          <div className="stat"><b>{stats.membres}</b><span>membres</span></div>
          <div className="stat"><b>{stats.verifies}</b><span>vérifiés</span></div>
          <div className="stat"><b>{stats.dossiers_en_attente}</b><span>dossiers à examiner</span></div>
          <div className="stat"><b>{stats.entretiens}</b><span>entretiens faits</span></div>
          <div className="stat"><b>{stats.presentations}</b><span>présentations</span></div>
          <div className="stat"><b>{stats.couples}</b><span>oui mutuels</span></div>
          <div className="stat"><b>{stats.messages}</b><span>messages échangés</span></div>
          <div className="stat"><b>{stats.signalements_ouverts}</b><span>signalements ouverts</span></div>
        </div>

        <VagueMatching />

        {signalements.length > 0 && (
          <section style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "16px" }}>
              Signalements ({signalements.filter((s) => !s.traite).length} à traiter)
            </h2>
            <div className="parcours">
              {signalements.map((s) => (
                <div key={s.id} className={"jalon" + (s.traite ? " fait" : " zone-danger")}>
                  <span className="pastille">{s.traite ? "✓" : "🚨"}</span>
                  <div style={{ flex: 1 }}>
                    <h3>
                      {s.auteur_prenom} signale {s.cible_prenom}
                      {s.cible_bannie && " (déjà banni)"}
                    </h3>
                    <p>&laquo;&nbsp;{s.motif}&nbsp;&raquo;</p>
                    <p style={{ fontSize: ".85rem", marginTop: "6px" }}>
                      Auteur&nbsp;: {s.auteur_email} — Cible&nbsp;: {s.cible_email}
                    </p>
                    {!s.traite && (
                      <TraiterSignalement id={s.id} cibleId={s.cible_id} cibleBannie={s.cible_bannie} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {dossiers.length === 0 && (
          <p className="chat-info">Aucun dossier en attente. ☕</p>
        )}

        <div className="admin-liste">
          {dossiers.map((u) => {
            const photos = u.medias.filter((m) => m.type === "photo");
            const video = u.medias.find((m) => m.type === "video");
            return (
              <article className="admin-dossier" key={u.id}>
                <div className="admin-entete">
                  <h3>{u.prenom}, {age(u.date_naissance)} ans</h3>
                  <span className="verif-detail">{u.email} · {u.genre || "genre non précisé"}</span>
                </div>
                <p className="admin-geste">Geste demandé : <strong>{u.geste_demande || "—"}</strong></p>
                <div className="admin-medias">
                  {photos.map((p) => (
                    <img key={p.id} src={`/api/media/${p.id}`} alt={`Photo de ${u.prenom}`} />
                  ))}
                  {video ? (
                    <video src={`/api/media/${video.id}`} controls playsInline />
                  ) : (
                    <p>⚠️ pas de vidéo</p>
                  )}
                </div>
                <DecisionAdmin utilisateurId={u.id} />
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
