import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { trouverParEmail } from "../../../lib/db";
import { creerSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, motDePasse } = await req.json();
    const utilisateur = await trouverParEmail((email || "").trim().toLowerCase());

    // Même message dans les deux cas : on ne révèle pas si l'email existe.
    const identifiantsInvalides = NextResponse.json(
      { erreur: "E-mail ou mot de passe incorrect." },
      { status: 401 }
    );

    if (!utilisateur) return identifiantsInvalides;
    const valide = await bcrypt.compare(motDePasse || "", utilisateur.mot_de_passe_hash);
    if (!valide) return identifiantsInvalides;

    await creerSession(utilisateur.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur connexion:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue. Réessayez dans un instant." }, { status: 500 });
  }
}
