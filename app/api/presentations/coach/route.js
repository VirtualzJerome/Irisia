// Le coach Irisia : un conseil PRIVÉ pendant la conversation
import { NextResponse } from "next/server";
import { lireSession } from "../../../../lib/session";
import {
  trouverParId, presentationActivePour, listerMessagesConversation, profilPublicDe,
} from "../../../../lib/db";
import { appelerClaude, promptSystemeCoach } from "../../../../lib/irisia";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await lireSession();
    if (!session) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
    const moi = await trouverParId(session.userId);
    if (!moi || moi.banni) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    const pres = await presentationActivePour(moi.id);
    if (!pres) return NextResponse.json({ erreur: "Aucune conversation en cours." }, { status: 404 });
    if (!(pres.reponse_a === "ACCEPTE" && pres.reponse_b === "ACCEPTE"))
      return NextResponse.json({ erreur: "La conversation n'est pas encore ouverte." }, { status: 403 });

    const autreId = pres.membre_a === moi.id ? pres.membre_b : pres.membre_a;
    const autre = await trouverParId(autreId);
    const messages = await listerMessagesConversation(pres.id, 0);
    if (messages.length < 2)
      return NextResponse.json(
        { erreur: "Échangez d'abord quelques messages — Irisia conseille mieux quand la conversation a commencé." },
        { status: 400 }
      );

    const transcription = messages
      .slice(-24)
      .map((m) => `${m.expediteur === moi.id ? moi.prenom : autre.prenom} : ${m.contenu}`)
      .join("\n");
    const portrait = typeof moi.portrait === "string" ? moi.portrait : JSON.stringify(moi.portrait || {});
    const profilAutre = JSON.stringify(profilPublicDe(autre));

    const conseil = await appelerClaude({
      systeme: promptSystemeCoach(moi.prenom, autre.prenom),
      messages: [{
        role: "user",
        content:
          `PROFIL PUBLIC DE ${autre.prenom} :\n${profilAutre}\n\n` +
          `PORTRAIT DE ${moi.prenom} (confidentiel) :\n${portrait}\n\n` +
          `LEUR CONVERSATION :\n${transcription}`,
      }],
      maxTokens: 350,
    });

    return NextResponse.json({ conseil });
  } catch (e) {
    console.error("Erreur coach:", e);
    return NextResponse.json({ erreur: "Irisia est momentanément indisponible." }, { status: 500 });
  }
}
