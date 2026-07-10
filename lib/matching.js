// ─────────────────────────────────────────────
// IRISIA — Le sélectionneur
// Trouve LA bonne personne pour un membre prêt :
// filtres croisés (genre, âge, disponibilité,
// jamais présentés) puis choix raisonné par Irisia.
// ─────────────────────────────────────────────
import { appelerClaude } from "./irisia";
import { envoyerEmail, emailPresentation } from "./email";
import {
  trouverParId,
  membresPrets,
  presentationActivePour,
  dejaPresentes,
  creerPresentation,
  derniersMotifsDeclin,
  marquerRecherche,
  verrouRecherche,
  libererVerrouRecherche,
  profilPublicDe,
  dernieresConfidences,
} from "./db";

const SEUIL_COMPATIBILITE = 60;
const MAX_CANDIDATS = 8;

function age(dateNaissance) {
  const n = new Date(dateNaissance);
  const auj = new Date();
  let a = auj.getFullYear() - n.getFullYear();
  const m = auj.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && auj.getDate() < n.getDate())) a--;
  return a;
}

function rechercheDe(portrait) {
  try {
    const p = typeof portrait === "string" ? JSON.parse(portrait) : portrait;
    return p?.recherche || {};
  } catch {
    return {};
  }
}

// Le genre de `personne` convient-il à ce que cherche `chercheur` ?
function genreConvient(chercheur, personne) {
  const voulu = (rechercheDe(chercheur.portrait).genre_recherche || "").toLowerCase();
  if (!voulu || voulu === "null" || voulu === "autre") return true; // pas de contrainte exprimée
  return (personne.genre || "").toLowerCase() === voulu;
}

// L'âge de `personne` entre-t-il dans la fourchette de `chercheur` ?
function ageConvient(chercheur, personne) {
  const r = rechercheDe(chercheur.portrait);
  const a = age(personne.date_naissance);
  if (r.age_min && a < Number(r.age_min) - 1) return false; // tolérance d'un an
  if (r.age_max && a > Number(r.age_max) + 1) return false;
  return true;
}

function compatiblesDansLesDeuxSens(m, c) {
  return (
    genreConvient(m, c) && genreConvient(c, m) &&
    ageConvient(m, c) && ageConvient(c, m)
  );
}

function resumePortrait(u) {
  const p = typeof u.portrait === "string" ? u.portrait : JSON.stringify(u.portrait);
  const pub = profilPublicDe(u);
  const infos = [
    pub.ville && `vit à ${pub.ville}`,
    pub.profession,
    pub.enfants === "oui" && "a des enfants",
    pub.souhait_enfants && `enfants souhaités: ${pub.souhait_enfants}`,
    pub.tabac && `tabac: ${pub.tabac}`,
    pub.passions && pub.passions.length ? `passions: ${pub.passions.join(", ")}` : null,
  ].filter(Boolean).join(" · ");
  return `ID: ${u.id}\nPrénom: ${u.prenom} — ${age(u.date_naissance)} ans — ${u.genre || "genre non précisé"}${infos ? `\nProfil: ${infos}` : ""}${pub.bio ? `\nBio: ${pub.bio}` : ""}\nPortrait: ${p}`;
}

function promptSelectionneur(retours) {
  return `Tu es le sélectionneur d'IRISIA, l'entremetteuse IA. On te donne le portrait d'un MEMBRE et une liste de CANDIDATS compatibles sur les critères de base. Ta mission : choisir la personne la plus prometteuse pour une vraie histoire — ou personne, si aucun candidat ne te convainc sincèrement. La rareté est la force d'IRISIA : mieux vaut aucune présentation qu'une présentation médiocre.

${retours ? `RETOURS RÉCENTS DU MEMBRE sur ses présentations passées (tiens-en compte) :\n${retours}\n` : ""}
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises Markdown :
{
  "membre_choisi": "l'ID exact du candidat retenu, ou null",
  "compatibilite": nombre de 0 à 100,
  "raison": "2-3 phrases d'analyse objective de la paire (usage interne)",
  "message_pour_membre": "3-4 phrases chaleureuses d'Irisia AU MEMBRE, le vouvoyant, expliquant pourquoi elle lui présente cette personne — en citant des éléments concrets et communs de leurs deux portraits, sans révéler d'informations intimes du candidat",
  "message_pour_choisi": "la même chose, mais adressée AU CANDIDAT à propos du membre",
  "brise_glace": "1-2 phrases suggérant aux deux un premier sujet de conversation concret, tiré de leurs points communs"
}
Règles : ne choisis que si la compatibilité est au moins ${SEUIL_COMPATIBILITE}. Les messages commencent directement (pas de "Bonjour"). Ne mentionne jamais de score ni ton fonctionnement.`;
}

// Cherche et crée une présentation pour ce membre. Retourne la présentation ou null.
export async function chercherPresentationPour(membreId) {
  const membre = await trouverParId(membreId);
  if (!membre) return null;
  if (membre.banni) return null;
  if (membre.en_pause) return null;
  if (membre.statut_verification !== "VERIFIE" || !membre.entretien_termine) return null;
  if (await presentationActivePour(membre.id)) return null;

  if (!(await verrouRecherche(membre.id))) return null; // une recherche est déjà en cours
  try {
    // 1. Candidats : prêts, compatibles dans les deux sens, jamais présentés, disponibles
    const tous = await membresPrets();
    const candidats = [];
    for (const c of tous) {
      if (c.id === membre.id) continue;
      if (!compatiblesDansLesDeuxSens(membre, c)) continue;
      if (await dejaPresentes(membre.id, c.id)) continue;
      if (await presentationActivePour(c.id)) continue; // exclusivité : une présentation à la fois
      candidats.push(c);
      if (candidats.length >= MAX_CANDIDATS) break;
    }

    await marquerRecherche(membre.id);
    if (candidats.length === 0) return null;

    // 2. Choix raisonné par Irisia
    const retours = (await derniersMotifsDeclin(membre.id)).join(" / ") || "";
    const confidences = await dernieresConfidences(membre.id);
    const blocConfidences = confidences.length
      ? "\n\nCONFIDENCES RÉCENTES DU MEMBRE (précieuses pour ton choix) :\n" +
        confidences.map((c) => `- ${c.question} → ${c.reponse}`).join("\n")
      : "";
    const contenu =
      `MEMBRE :\n${resumePortrait(membre)}${blocConfidences}\n\nCANDIDATS :\n` +
      candidats.map(resumePortrait).join("\n---\n");

    const brut = await appelerClaude({
      systeme: promptSelectionneur(retours),
      messages: [{ role: "user", content: contenu }],
      maxTokens: 1000,
    });

    let choix;
    try {
      choix = JSON.parse(brut.replace(/```json|```/g, "").trim());
    } catch {
      console.error("Sélectionneur : JSON illisible :", brut.slice(0, 200));
      return null;
    }

    const retenu = candidats.find((c) => c.id === choix.membre_choisi);
    if (!retenu || Number(choix.compatibilite) < SEUIL_COMPATIBILITE) return null;

    // 3. Créer la présentation (double contrôle de disponibilité juste avant)
    if (await presentationActivePour(retenu.id)) return null;
    const presentation = await creerPresentation({
      membreA: membre.id,
      membreB: retenu.id,
      raison: choix.raison || null,
      messagePourA: choix.message_pour_membre || "J'ai le sentiment que vous devriez faire connaissance.",
      messagePourB: choix.message_pour_choisi || "J'ai le sentiment que vous devriez faire connaissance.",
      briseGlace: choix.brise_glace || null,
    });

    // Les lettres d'Irisia partent aux deux membres (sans bloquer si l'envoi échoue)
    for (const dest of [membre, retenu]) {
      const complet = await trouverParId(dest.id);
      envoyerEmail({ a: complet.email, ...emailPresentation(complet.prenom) }).catch(() => {});
    }
    return presentation;
  } finally {
    await libererVerrouRecherche(membre.id);
  }
}
