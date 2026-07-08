// POST { motif } — signale l'autre membre de ma présentation active et la ferme
import { NextResponse } from "next/server";
import { lireSession } from "../../../lib/session";
import {
  trouverParId, presentationActivePour, repondrePresentation,
  creerSignalement, marquerRecherche,
} from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const moi = await trouverParId(session.userId);
    if (!moi) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    if (moi.banni)
      return NextResponse.json({ erreur: "Ce compte a été suspendu." }, { status: 403 });

    const { motif } = await req.json();
    const texte = (motif || "").trim();
    if (texte.length < 5)
      return NextResponse.json({ erreur: "Décrivez brièvement le problème (5 caractères minimum)." }, { status: 400 });

    const pres = await presentationActivePour(moi.id);
    if (!pres) return NextResponse.json({ erreur: "Aucune présentation en cours." }, { status: 400 });

    const cible = pres.membre_a === moi.id ? pres.membre_b : pres.membre_a;
    await creerSignalement(moi.id, cible, texte.slice(0, 1000));
    // La présentation se ferme immédiatement — vous ne serez jamais représentés
    await repondrePresentation(pres.id, moi.id, "DECLINE", "Signalement");
    await marquerRecherche(moi.id).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur signalement:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
