// GET : mon profil complet — POST : mise à jour (champs validés un à un)
import { NextResponse } from "next/server";
import { lireSession } from "../../../lib/session";
import { trouverParId, mettreAJourProfil, profilPublicDe, listerMedias } from "../../../lib/db";
import {
  PASSIONS, MAX_PASSIONS, PROMPTS, MAX_PROMPTS, LONGUEUR_MAX_REPONSE,
  COULEURS, OPTIONS_ENFANTS, OPTIONS_SOUHAIT_ENFANTS, OPTIONS_TABAC,
  calculerCompletude,
} from "../../../lib/options-profil";

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
    const profil = profilPublicDe(u);
    const medias = await listerMedias(u.id);
    const photos = medias.filter((m) => m.type === "photo").map((m) => m.id);
    return NextResponse.json({
      prenom: u.prenom,
      entretien_termine: u.entretien_termine,
      en_pause: !!u.en_pause,
      profil,
      photos,
      completude: calculerCompletude(profil, photos.length),
    });
  } catch (e) {
    console.error("Erreur GET profil:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const u = await moi();
    if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const corps = await req.json();
    const maj = {};

    if ("ville" in corps) maj.ville = (corps.ville || "").trim().slice(0, 60) || null;
    if ("profession" in corps) maj.profession = (corps.profession || "").trim().slice(0, 60) || null;
    if ("taille_cm" in corps) {
      if (corps.taille_cm === null || corps.taille_cm === "") maj.taille_cm = null;
      else {
        const t = Number(corps.taille_cm);
        if (!Number.isInteger(t) || t < 120 || t > 230)
          return NextResponse.json({ erreur: "La taille doit être entre 120 et 230 cm." }, { status: 400 });
        maj.taille_cm = t;
      }
    }
    if ("enfants" in corps) {
      if (corps.enfants && !OPTIONS_ENFANTS.some((o) => o.valeur === corps.enfants))
        return NextResponse.json({ erreur: "Choix « enfants » invalide." }, { status: 400 });
      maj.enfants = corps.enfants || null;
    }
    if ("souhait_enfants" in corps) {
      if (corps.souhait_enfants && !OPTIONS_SOUHAIT_ENFANTS.some((o) => o.valeur === corps.souhait_enfants))
        return NextResponse.json({ erreur: "Choix « souhait d'enfants » invalide." }, { status: 400 });
      maj.souhait_enfants = corps.souhait_enfants || null;
    }
    if ("tabac" in corps) {
      if (corps.tabac && !OPTIONS_TABAC.some((o) => o.valeur === corps.tabac))
        return NextResponse.json({ erreur: "Choix « tabac » invalide." }, { status: 400 });
      maj.tabac = corps.tabac || null;
    }
    if ("passions" in corps) {
      const liste = Array.isArray(corps.passions) ? corps.passions : [];
      if (liste.length > MAX_PASSIONS)
        return NextResponse.json({ erreur: `${MAX_PASSIONS} passions maximum.` }, { status: 400 });
      if (!liste.every((x) => PASSIONS.includes(x)))
        return NextResponse.json({ erreur: "Passion inconnue." }, { status: 400 });
      maj.passions = liste;
    }
    if ("reponses_prompts" in corps) {
      const liste = Array.isArray(corps.reponses_prompts) ? corps.reponses_prompts : [];
      if (liste.length > MAX_PROMPTS)
        return NextResponse.json({ erreur: `${MAX_PROMPTS} questions maximum.` }, { status: 400 });
      for (const r of liste) {
        if (!PROMPTS.includes(r?.question))
          return NextResponse.json({ erreur: "Question inconnue." }, { status: 400 });
        if (!r?.reponse || !r.reponse.trim())
          return NextResponse.json({ erreur: "Une réponse est vide." }, { status: 400 });
        if (r.reponse.length > LONGUEUR_MAX_REPONSE)
          return NextResponse.json({ erreur: `Réponses : ${LONGUEUR_MAX_REPONSE} caractères max.` }, { status: 400 });
      }
      maj.reponses_prompts = liste.map((r) => ({ question: r.question, reponse: r.reponse.trim() }));
    }
    if ("bio" in corps) maj.bio = (corps.bio || "").trim().slice(0, 300) || null;
    if ("en_pause" in corps) {
      if (typeof corps.en_pause !== "boolean")
        return NextResponse.json({ erreur: "Valeur de pause invalide." }, { status: 400 });
      maj.en_pause = corps.en_pause;
    }
    if ("couleur_accent" in corps) {
      if (corps.couleur_accent && !COULEURS[corps.couleur_accent])
        return NextResponse.json({ erreur: "Couleur inconnue." }, { status: 400 });
      maj.couleur_accent = corps.couleur_accent || null;
    }

    await mettreAJourProfil(u.id, maj);
    const apres = await trouverParId(u.id);
    const profil = profilPublicDe(apres);
    const medias = await listerMedias(u.id);
    const photos = medias.filter((m) => m.type === "photo").map((m) => m.id);
    return NextResponse.json({ ok: true, profil, en_pause: !!apres.en_pause, completude: calculerCompletude(profil, photos.length) });
  } catch (e) {
    console.error("Erreur POST profil:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
