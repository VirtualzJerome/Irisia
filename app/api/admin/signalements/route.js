// POST { id, action: "traiter" | "bannir", cibleId? } — gestion des signalements
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import { trouverParId, marquerSignalementTraite, bannir } from "../../../../lib/db";
import { estAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const moi = await trouverParId(session.userId);
    if (!moi || !estAdmin(moi)) return NextResponse.json({ erreur: "Accès réservé." }, { status: 403 });

    const { id, action, cibleId } = await req.json();
    if (!id || !["traiter", "bannir"].includes(action))
      return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

    if (action === "bannir") {
      if (!cibleId) return NextResponse.json({ erreur: "Cible manquante." }, { status: 400 });
      await bannir(cibleId);
    }
    await marquerSignalementTraite(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur gestion signalement:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
