import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { trouverParEmail, verifierBlocage, enregistrerEchecConnexion, effacerEchecsConnexion } from "../../../lib/db";
import { creerSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, motDePasse } = await req.json();
    const emailPropre = (email || "").trim().toLowerCase();

    const minutes = await verifierBlocage(emailPropre);
    if (minutes > 0)
      return NextResponse.json(
        { erreur: `Trop de tentatives. Compte temporairement verrouillé — réessayez dans ${minutes} min.` },
        { status: 429 }
      );

    const utilisateur = await trouverParEmail(emailPropre);

    // Même message dans les deux cas : on ne révèle pas si l'email existe.
    const identifiantsInvalides = NextResponse.json(
      { erreur: "E-mail ou mot de passe incorrect." },
      { status: 401 }
    );

    if (!utilisateur) {
      await enregistrerEchecConnexion(emailPropre);
      return identifiantsInvalides;
    }
    const valide = await bcrypt.compare(motDePasse || "", utilisateur.mot_de_passe_hash);
    if (!valide) {
      await enregistrerEchecConnexion(emailPropre);
      return identifiantsInvalides;
    }
    if (utilisateur.banni)
      return NextResponse.json(
        { erreur: "Ce compte a été suspendu. Contactez-nous si vous pensez qu'il s'agit d'une erreur." },
        { status: 403 }
      );
    await effacerEchecsConnexion(emailPropre);

    await creerSession(utilisateur.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur connexion:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue. Réessayez dans un instant." }, { status: 500 });
  }
}
