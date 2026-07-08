// GET : état de la vérification du membre (photos, vidéo, geste, statut)
// POST : envoi d'un fichier (photo ou vidéo) puis soumission
import { NextResponse } from "next/server";
import { lireSession } from "../../../lib/session";
import {
  trouverParId, definirGeste, listerMedias, ajouterMedia, soumettreVerification,
} from "../../../lib/db";

export const dynamic = "force-dynamic";

const GESTES = [
  "Tournez lentement la tête vers la gauche, puis revenez face caméra",
  "Tournez lentement la tête vers la droite, puis revenez face caméra",
  "Levez les yeux vers le plafond, puis regardez la caméra en souriant",
  "Clignez deux fois des yeux, puis tournez la tête vers la droite",
  "Souriez, puis montrez trois doigts devant vous",
];

const TAILLE_MAX_PHOTO = 3 * 1024 * 1024;   // 3 Mo
const TAILLE_MAX_VIDEO = 4 * 1024 * 1024;   // 4 Mo (limite Vercel oblige)
const MAX_PHOTOS = 3;

async function membre() {
  const session = await lireSession();
  if (!session) return null;
  return trouverParId(session.userId);
}

export async function GET() {
  try {
    const u = await membre();
    if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    // Attribuer un geste s'il n'en a pas encore
    let geste = u.geste_demande;
    if (!geste) {
      geste = GESTES[Math.floor(Math.random() * GESTES.length)];
      await definirGeste(u.id, geste);
    }

    const medias = await listerMedias(u.id);
    return NextResponse.json({
      statut: u.statut_verification,
      geste,
      photos: medias.filter((m) => m.type === "photo").map((m) => ({ id: m.id })),
      video: medias.find((m) => m.type === "video")?.id || null,
    });
  } catch (e) {
    console.error("Erreur GET verification:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const u = await membre();
    if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    if (u.statut_verification === "VERIFIE" || u.statut_verification === "EN_ATTENTE")
      return NextResponse.json(
        { erreur: "Votre dossier est déjà " + (u.statut_verification === "VERIFIE" ? "vérifié." : "en cours d'examen.") },
        { status: 400 }
      );

    const forme = await req.formData();
    const action = forme.get("action");

    // ── Soumission finale ──
    if (action === "soumettre") {
      const medias = await listerMedias(u.id);
      const nbPhotos = medias.filter((m) => m.type === "photo").length;
      const aVideo = medias.some((m) => m.type === "video");
      if (nbPhotos < 1)
        return NextResponse.json({ erreur: "Ajoutez au moins une photo." }, { status: 400 });
      if (!aVideo)
        return NextResponse.json({ erreur: "Enregistrez votre selfie vidéo." }, { status: 400 });
      await soumettreVerification(u.id);
      return NextResponse.json({ ok: true, statut: "EN_ATTENTE" });
    }

    // ── Réception d'un fichier ──
    const fichier = forme.get("fichier");
    const type = forme.get("type"); // "photo" ou "video"
    if (!fichier || typeof fichier === "string")
      return NextResponse.json({ erreur: "Aucun fichier reçu." }, { status: 400 });
    if (type !== "photo" && type !== "video")
      return NextResponse.json({ erreur: "Type de fichier inconnu." }, { status: 400 });

    const mime = fichier.type || "";
    if (type === "photo" && !mime.startsWith("image/"))
      return NextResponse.json({ erreur: "Ce fichier n'est pas une image." }, { status: 400 });
    if (type === "video" && !mime.startsWith("video/"))
      return NextResponse.json({ erreur: "Ce fichier n'est pas une vidéo." }, { status: 400 });

    const donnees = Buffer.from(await fichier.arrayBuffer());
    const limite = type === "photo" ? TAILLE_MAX_PHOTO : TAILLE_MAX_VIDEO;
    if (donnees.length > limite)
      return NextResponse.json(
        { erreur: `Fichier trop lourd (${(donnees.length / 1048576).toFixed(1)} Mo, maximum ${(limite / 1048576).toFixed(0)} Mo).` },
        { status: 400 }
      );
    if (donnees.length < 100)
      return NextResponse.json({ erreur: "Fichier vide ou illisible." }, { status: 400 });

    if (type === "photo") {
      const medias = await listerMedias(u.id);
      if (medias.filter((m) => m.type === "photo").length >= MAX_PHOTOS)
        return NextResponse.json({ erreur: `${MAX_PHOTOS} photos maximum — supprimez-en une d'abord.` }, { status: 400 });
    }

    const id = await ajouterMedia(u.id, type, mime, donnees);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("Erreur POST verification:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue pendant l'envoi." }, { status: 500 });
  }
}
