// POST { email } — répond toujours ok (pas d'énumération de comptes)
import { NextResponse } from "next/server";
import { trouverParEmail, creerJetonReinitialisation } from "../../../../lib/db";
import { envoyerEmail, emailReinitialisation, urlApp } from "../../../../lib/email";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email } = await req.json();
    const utilisateur = await trouverParEmail((email || "").trim().toLowerCase());
    if (utilisateur && !utilisateur.banni) {
      const jeton = await creerJetonReinitialisation(utilisateur.id);
      const lien = `${urlApp()}/reinitialiser?jeton=${jeton}`;
      await envoyerEmail({ a: utilisateur.email, ...emailReinitialisation(utilisateur.prenom, lien) });
    }
    // Toujours la même réponse, que le compte existe ou non
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur oubli mot de passe:", e);
    return NextResponse.json({ ok: true });
  }
}
