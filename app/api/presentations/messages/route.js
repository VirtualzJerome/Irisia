// Conversation privée entre deux membres qui ont TOUS LES DEUX accepté.
// GET ?apres=<id> : nouveaux messages — POST { message } : envoyer
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import {
  trouverParId, presentationActivePour,
  listerMessagesConversation, ajouterMessageConversation,
  marquerConversationLue,
} from "../../../../lib/db";

export const dynamic = "force-dynamic";

async function contexte() {
  const session = await lireSession();
  if (!session) return { code: 401 };
  const moi = await trouverParId(session.userId);
  if (!moi) return { code: 401 };
  if (moi.banni) return { code: 403 };
  const pres = await presentationActivePour(moi.id);
  if (!pres) return { code: 404 };
  const mutuelle = pres.reponse_a === "ACCEPTE" && pres.reponse_b === "ACCEPTE";
  if (!mutuelle) return { code: 403 };
  return { moi, pres };
}

export async function GET(req) {
  try {
    const c = await contexte();
    if (!c.pres) return NextResponse.json({ erreur: "Conversation indisponible." }, { status: c.code });
    const apres = Number(new URL(req.url).searchParams.get("apres") || 0);
    const messages = await listerMessagesConversation(c.pres.id, apres);
    await marquerConversationLue(c.pres.id, c.moi.id);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        de_moi: m.expediteur === c.moi.id,
        contenu: m.contenu,
      })),
    });
  } catch (e) {
    console.error("Erreur GET conversation:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const c = await contexte();
    if (!c.pres) return NextResponse.json({ erreur: "Conversation indisponible." }, { status: c.code });
    const { message } = await req.json();
    const texte = (message || "").trim();
    if (!texte) return NextResponse.json({ erreur: "Message vide." }, { status: 400 });
    if (texte.length > 2000)
      return NextResponse.json({ erreur: "Message trop long (2000 caractères max)." }, { status: 400 });
    const enregistre = await ajouterMessageConversation(c.pres.id, c.moi.id, texte);
    return NextResponse.json({ ok: true, id: enregistre.id });
  } catch (e) {
    console.error("Erreur POST conversation:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
