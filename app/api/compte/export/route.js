// GET : télécharger toutes ses données (RGPD, droit à la portabilité)
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import { exporterDonnees } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const donnees = await exporterDonnees(session.userId);
    if (!donnees) return NextResponse.json({ erreur: "Compte introuvable." }, { status: 404 });
    return new NextResponse(JSON.stringify(donnees, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mes-donnees-irisia.json"',
      },
    });
  } catch (e) {
    console.error("Erreur export:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
