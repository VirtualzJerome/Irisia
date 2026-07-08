// POST : Irisia propose une bio à partir du portrait (le membre relit puis enregistre)
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import { trouverParId } from "../../../../lib/db";
import { appelerClaude, promptSystemeBio } from "../../../../lib/irisia";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const u = await trouverParId(session.userId);
    if (!u || u.banni) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    if (!u.entretien_termine)
      return NextResponse.json(
        { erreur: "Terminez d'abord votre entretien : c'est là qu'Irisia apprend à vous connaître." },
        { status: 400 }
      );

    const portrait = typeof u.portrait === "string" ? u.portrait : JSON.stringify(u.portrait || {});
    const bio = await appelerClaude({
      systeme: promptSystemeBio(u.prenom),
      messages: [{ role: "user", content: `Portrait de ${u.prenom} :\n${portrait}` }],
      maxTokens: 300,
    });
    return NextResponse.json({ bio: bio.slice(0, 300) });
  } catch (e) {
    console.error("Erreur bio Irisia:", e);
    return NextResponse.json({ erreur: "Irisia est momentanément indisponible." }, { status: 500 });
  }
}
