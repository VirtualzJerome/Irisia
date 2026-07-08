// Sert une photo/vidéo stockée en base — uniquement à son
// propriétaire ou à un administrateur. DELETE pour le propriétaire.
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import { trouverParId, obtenirMedia, supprimerMedia, partagentPresentationActive } from "../../../../lib/db";
import { estAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

async function acces(id) {
  const session = await lireSession();
  if (!session) return { code: 401 };
  const u = await trouverParId(session.userId);
  if (!u) return { code: 401 };
  const media = await obtenirMedia(id);
  if (!media) return { code: 404 };
  let autorise = media.utilisateur === u.id || estAdmin(u.email);
  // Membres liés par une présentation active : photos visibles, vidéo de vérification JAMAIS
  if (!autorise && media.type === "photo")
    autorise = await partagentPresentationActive(media.utilisateur, u.id);
  if (!autorise) return { code: 403 };
  return { media, u };
}

export async function GET(req, { params }) {
  try {
    const r = await acces(params.id);
    if (!r.media) return new NextResponse(null, { status: r.code });
    return new NextResponse(r.media.donnees, {
      headers: {
        "Content-Type": r.media.mime,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("Erreur media:", e);
    return new NextResponse(null, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const r = await acces(params.id);
    if (!r.media) return NextResponse.json({ erreur: "Introuvable." }, { status: r.code });
    if (r.u.statut_verification === "EN_ATTENTE" || r.u.statut_verification === "VERIFIE")
      return NextResponse.json({ erreur: "Dossier verrouillé." }, { status: 400 });
    await supprimerMedia(params.id, r.u.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur suppression media:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
