import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import { trouverParId, deciderVerification } from "../../../../lib/db";
import { estAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const u = await trouverParId(session.userId);
    if (!u || !estAdmin(u.email))
      return NextResponse.json({ erreur: "Accès réservé." }, { status: 403 });

    const { utilisateurId, decision } = await req.json();
    if (!utilisateurId || !["VERIFIE", "REFUSE"].includes(decision))
      return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

    await deciderVerification(utilisateurId, decision);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur décision admin:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
