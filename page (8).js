import { NextResponse } from "next/server";
import { lireSession } from "../../../lib/session";
import {
  trouverParId,
  listerMessagesEntretien,
  ajouterMessageEntretien,
  terminerEntretien,
} from "../../../lib/db";
import {
  appelerClaude,
  messageOuverture,
  promptSystemeEntretien,
  promptSystemePortrait,
  MARQUEUR_FIN,
} from "../../../lib/irisia";

export const dynamic = "force-dynamic";

// Garde-fous anti-abus
const LONGUEUR_MAX_MESSAGE = 1500;
const NB_MESSAGES_MAX = 80;

async function utilisateurConnecte() {
  const session = await lireSession();
  if (!session) return null;
  return trouverParId(session.userId);
}

// ── GET : charger l'entretien (et l'ouvrir s'il n'existe pas) ──
export async function GET() {
  try {
    const utilisateur = await utilisateurConnecte();
    if (!utilisateur)
      return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    let messages = await listerMessagesEntretien(utilisateur.id);

    // Premier passage : Irisia ouvre la conversation
    if (messages.length === 0 && !utilisateur.entretien_termine) {
      const ouverture = messageOuverture(utilisateur.prenom);
      await ajouterMessageEntretien(utilisateur.id, "assistant", ouverture);
      messages = [{ role: "assistant", contenu: ouverture }];
    }

    return NextResponse.json({
      prenom: utilisateur.prenom,
      termine: utilisateur.entretien_termine,
      messages,
    });
  } catch (e) {
    console.error("Erreur GET entretien:", e);
    return NextResponse.json(
      { erreur: "Une erreur est survenue. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}

// ── POST : envoyer un message à Irisia ──
export async function POST(req) {
  try {
    const utilisateur = await utilisateurConnecte();
    if (!utilisateur)
      return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

    if (utilisateur.entretien_termine)
      return NextResponse.json(
        { erreur: "Votre entretien est déjà terminé." },
        { status: 400 }
      );

    const { message } = await req.json();
    const texte = (message || "").trim();
    if (!texte)
      return NextResponse.json({ erreur: "Votre message est vide." }, { status: 400 });
    if (texte.length > LONGUEUR_MAX_MESSAGE)
      return NextResponse.json(
        { erreur: "Votre message est trop long — allez-y par étapes." },
        { status: 400 }
      );

    const historique = await listerMessagesEntretien(utilisateur.id);
    if (historique.length >= NB_MESSAGES_MAX)
      return NextResponse.json(
        { erreur: "L'entretien a atteint sa limite. Irisia va conclure avec ce qu'elle sait." },
        { status: 400 }
      );

    // Enregistrer le message du membre
    await ajouterMessageEntretien(utilisateur.id, "user", texte);

    // Construire l'historique pour Claude
    const messagesClaude = [
      ...historique.map((m) => ({ role: m.role, content: m.contenu })),
      { role: "user", content: texte },
    ];

    // Irisia répond
    let reponse = await appelerClaude({
      systeme: promptSystemeEntretien(utilisateur.prenom),
      messages: messagesClaude,
      maxTokens: 500,
    });

    // Fin d'entretien ?
    const termine = reponse.includes(MARQUEUR_FIN);
    if (termine) reponse = reponse.replaceAll(MARQUEUR_FIN, "").trim();

    await ajouterMessageEntretien(utilisateur.id, "assistant", reponse);

    if (termine) {
      // Générer le portrait à partir de la transcription complète
      const transcription = [...messagesClaude, { role: "assistant", content: reponse }]
        .map((m) => `${m.role === "user" ? utilisateur.prenom : "Irisia"} : ${m.content}`)
        .join("\n\n");

      let portrait;
      try {
        const brut = await appelerClaude({
          systeme: promptSystemePortrait(),
          messages: [{ role: "user", content: transcription }],
          maxTokens: 1200,
        });
        const nettoye = brut.replace(/```json|```/g, "").trim();
        portrait = JSON.parse(nettoye);
      } catch (e) {
        console.error("Portrait illisible, stockage brut:", e);
        portrait = { erreur_analyse: true };
      }

      await terminerEntretien(utilisateur.id, JSON.stringify(portrait));
    }

    return NextResponse.json({ reponse, termine });
  } catch (e) {
    console.error("Erreur POST entretien:", e);
    return NextResponse.json(
      { erreur: "Irisia est momentanément indisponible. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
