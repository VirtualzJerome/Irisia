// POST { jeton, motDePasse } — jeton à usage unique, valable 1 h
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  consommerJetonReinitialisation, changerMotDePasse,
  trouverParId, effacerEchecsConnexion,
} from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { jeton, motDePasse } = await req.json();
    if (!motDePasse || motDePasse.length < 8)
      return NextResponse.json({ erreur: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });

    const utilisateurId = await consommerJetonReinitialisation(jeton);
    if (!utilisateurId)
      return NextResponse.json(
        { erreur: "Ce lien est invalide ou expiré. Refaites une demande depuis « Mot de passe oublié »." },
        { status: 400 }
      );

    await changerMotDePasse(utilisateurId, await bcrypt.hash(motDePasse, 10));
    const u = await trouverParId(utilisateurId);
    if (u) await effacerEchecsConnexion(u.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur réinitialisation:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
