// GET : ma présentation active (déclenche une recherche si besoin)
// POST : répondre — { action:"repondre", reponse:"ACCEPTE"|"DECLINE", motif? }
import { NextResponse } from "next/server";
import { lireSession } from "../../../lib/session";
import {
  trouverParId, presentationActivePour, repondrePresentation,
  listerMedias, marquerRecherche, profilPublicDe,
} from "../../../lib/db";
import { chercherPresentationPour } from "../../../lib/matching";
import { envoyerEmail, emailMutuel } from "../../../lib/email";

export const dynamic = "force-dynamic";
const DELAI_RECHERCHE_MS = 5 * 60 * 1000; // 5 minutes entre deux recherches auto

function age(d) {
  const n = new Date(d), a = new Date();
  let x = a.getFullYear() - n.getFullYear();
  const m = a.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < n.getDate())) x--;
  return x;
}

async function vue(pres, moi) {
  const suisA = pres.membre_a === moi.id;
  const autreId = suisA ? pres.membre_b : pres.membre_a;
  const autre = await trouverParId(autreId);
  const medias = await listerMedias(autreId);
  const maReponse = suisA ? pres.reponse_a : pres.reponse_b;
  const saReponse = suisA ? pres.reponse_b : pres.reponse_a;
  return {
    id: pres.id,
    prenom: autre.prenom,
    age: age(autre.date_naissance),
    photos: medias.filter((m) => m.type === "photo").map((m) => m.id),
    message_irisia: suisA ? pres.message_pour_a : pres.message_pour_b,
    ma_reponse: maReponse,
    elle_a_accepte: saReponse === "ACCEPTE",
    mutuelle: maReponse === "ACCEPTE" && saReponse === "ACCEPTE",
    brise_glace: pres.brise_glace || null,
    profil: profilPublicDe(autre),
  };
}

export async function GET() {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const moi = await trouverParId(session.userId);
    if (!moi) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    if (moi.banni)
      return NextResponse.json({ erreur: "Ce compte a été suspendu." }, { status: 403 });

    const manque = [];
    if (moi.statut_verification !== "VERIFIE") manque.push("verification");
    if (!moi.entretien_termine) manque.push("entretien");
    if (manque.length) return NextResponse.json({ pret: false, manque });

    let pres = await presentationActivePour(moi.id);

    // Pas de présentation ? On tente une recherche (avec délai anti-rafale)
    if (!pres) {
      const derniere = moi.derniere_recherche ? new Date(moi.derniere_recherche).getTime() : 0;
      if (Date.now() - derniere > DELAI_RECHERCHE_MS) {
        try {
          pres = await chercherPresentationPour(moi.id);
        } catch (e) {
          console.error("Recherche de présentation échouée:", e);
          await marquerRecherche(moi.id).catch(() => {});
        }
      }
    }

    if (!pres) return NextResponse.json({ pret: true, presentation: null });
    return NextResponse.json({ pret: true, presentation: await vue(pres, moi) });
  } catch (e) {
    console.error("Erreur GET presentations:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const moi = await trouverParId(session.userId);
    if (!moi) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    if (moi.banni)
      return NextResponse.json({ erreur: "Ce compte a été suspendu." }, { status: 403 });

    const { action, reponse, motif } = await req.json();
    if (action !== "repondre" || !["ACCEPTE", "DECLINE"].includes(reponse))
      return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

    const pres = await presentationActivePour(moi.id);
    if (!pres) return NextResponse.json({ erreur: "Aucune présentation en cours." }, { status: 400 });

    const maj = await repondrePresentation(pres.id, moi.id, reponse, (motif || "").slice(0, 500));

    // Si les deux viennent de dire oui : la bonne nouvelle part aux deux
    if (maj && maj.reponse_a === "ACCEPTE" && maj.reponse_b === "ACCEPTE") {
      const a = await trouverParId(maj.membre_a);
      const b = await trouverParId(maj.membre_b);
      envoyerEmail({ a: a.email, ...emailMutuel(a.prenom, b.prenom) }).catch(() => {});
      envoyerEmail({ a: b.email, ...emailMutuel(b.prenom, a.prenom) }).catch(() => {});
    }
    if (reponse === "DECLINE") await marquerRecherche(moi.id).catch(() => {});
    return NextResponse.json({ ok: true, presentation: await vue(maj, moi) });
  } catch (e) {
    console.error("Erreur POST presentations:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
