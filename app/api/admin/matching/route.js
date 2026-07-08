// Bouton admin : lancer une vague de recherche pour tous les membres prêts
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import { trouverParId, membresPrets, presentationActivePour } from "../../../../lib/db";
import { estAdmin } from "../../../../lib/admin";
import { chercherPresentationPour } from "../../../../lib/matching";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const moi = await trouverParId(session.userId);
    if (!moi || !estAdmin(moi)) return NextResponse.json({ erreur: "Accès réservé." }, { status: 403 });

    const prets = await membresPrets();
    let creees = 0, examines = 0;
    for (const m of prets) {
      if (examines >= 10) break; // vague limitée : relancer le bouton si besoin
      if (await presentationActivePour(m.id)) continue;
      examines++;
      const pres = await chercherPresentationPour(m.id).catch((e) => {
        console.error("Vague matching, membre", m.id, e);
        return null;
      });
      if (pres) creees++;
    }
    return NextResponse.json({ ok: true, membres_examines: examines, presentations_creees: creees });
  } catch (e) {
    console.error("Erreur vague matching:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue." }, { status: 500 });
  }
}
