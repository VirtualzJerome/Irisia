import Link from "next/link";
import { redirect } from "next/navigation";
import { lireSession } from "../../lib/session";
import { trouverParId, listerEnAttente, listerMedias } from "../../lib/db";
import { estAdmin } from "../../lib/admin";
import DecisionAdmin from "../../components/DecisionAdmin";
import VagueMatching from "../../components/VagueMatching";

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

  const enAttente = await listerEnAttente();
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
        <VagueMatching />

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
