// La confidence du jour : GET → la question d'Irisia — POST { question, reponse }
import { NextResponse } from "next/server";
import { lireSession } from "../../../lib/session";
import { trouverParId, prochaineConfidence, enregistrerConfidence } from "../../../lib/db";

export const dynamic = "force-dynamic";

async function moi() {
  const session = await lireSession();
  if (!session) return null;
  const u = await trouverParId(session.userId);
  if (u?.banni) return null;
  return u;
}

export async function GET() {
  try {
    const u = await moi();
    if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    if (!u.entretien_termine) return NextResponse.json({ question: null });
    const question = await prochaineConfidence(u.id);
    return NextResponse.json({ question });
  } catch (e) {
    console.error("Erreur GET confidence:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const u = await moi();
    if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const { question, reponse } = await req.json();
    const texte = (reponse || "").trim();
    if (!texte) return NextResponse.json({ erreur: "Votre réponse est vide." }, { status: 400 });
    if (texte.length > 400)
      return NextResponse.json({ erreur: "400 caractères maximum — Irisia aime les confidences, pas les romans." }, { status: 400 });
    const ok = await enregistrerConfidence(u.id, question, texte.slice(0, 400));
    if (!ok) return NextResponse.json({ erreur: "Question inconnue." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST confidence:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
