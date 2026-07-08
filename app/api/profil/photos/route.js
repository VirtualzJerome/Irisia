// POST (formData: fichier) : ajouter une photo — DELETE { id } : la retirer
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import { trouverParId, listerMedias, ajouterMedia, obtenirMedia, supprimerMedia } from "../../../../lib/db";

export const dynamic = "force-dynamic";
const TAILLE_MAX = 3 * 1024 * 1024;
const MAX_PHOTOS = 6;

async function moi() {
  const session = await lireSession();
  if (!session) return null;
  const u = await trouverParId(session.userId);
  if (u?.banni) return null;
  return u;
}

export async function POST(req) {
  try {
    const u = await moi();
    if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    const medias = await listerMedias(u.id);
    const photos = medias.filter((m) => m.type === "photo");
    if (photos.length >= MAX_PHOTOS)
      return NextResponse.json({ erreur: `${MAX_PHOTOS} photos maximum — retirez-en une d'abord.` }, { status: 400 });

    const donnees = await req.formData();
    const fichier = donnees.get("fichier");
    if (!fichier || typeof fichier === "string")
      return NextResponse.json({ erreur: "Aucune photo reçue." }, { status: 400 });
    if (!(fichier.type || "").startsWith("image/"))
      return NextResponse.json({ erreur: "Le fichier doit être une image." }, { status: 400 });
    const octets = Buffer.from(await fichier.arrayBuffer());
    if (octets.length < 100)
      return NextResponse.json({ erreur: "Cette image semble vide." }, { status: 400 });
    if (octets.length > TAILLE_MAX)
      return NextResponse.json({ erreur: "Photo trop lourde (3 Mo maximum)." }, { status: 400 });

    const id = await ajouterMedia(u.id, "photo", fichier.type, octets);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("Erreur ajout photo:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const u = await moi();
    if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    const { id } = await req.json();
    const media = await obtenirMedia(id);
    if (!media || media.utilisateur !== u.id || media.type !== "photo")
      return NextResponse.json({ erreur: "Photo introuvable." }, { status: 404 });

    const photos = (await listerMedias(u.id)).filter((m) => m.type === "photo");
    if (photos.length <= 1)
      return NextResponse.json({ erreur: "Gardez au moins une photo sur votre profil." }, { status: 400 });

    const supprime = await supprimerMedia(id, u.id);
    if (!supprime)
      return NextResponse.json({ erreur: "Photo introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur retrait photo:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
