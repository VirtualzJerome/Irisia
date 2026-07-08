// DELETE : suppression définitive du compte (RGPD) — mot de passe exigé
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { lireSession, supprimerSession } from "../../../lib/session";
import { trouverParId, supprimerCompte } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(req) {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const moi = await trouverParId(session.userId);
    if (!moi) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    const { motDePasse } = await req.json();
    const valide = await bcrypt.compare(motDePasse || "", moi.mot_de_passe_hash);
    if (!valide)
      return NextResponse.json({ erreur: "Mot de passe incorrect." }, { status: 403 });

    await supprimerCompte(moi.id); // cascade : photos, vidéo, entretien, présentations, conversations
    supprimerSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur suppression compte:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
