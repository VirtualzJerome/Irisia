// ─────────────────────────────────────────────
// IRISIA — Envoi d'emails (Resend)
// Sans RESEND_API_KEY : mode simulation, l'email
// est écrit dans les journaux et rien ne casse.
// ─────────────────────────────────────────────

export function urlApp() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function gabarit(prenom, corps, bouton) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#251D38;padding:32px 16px;font-family:Georgia,serif;color:#EFEAF6;">
  <div style="max-width:520px;margin:0 auto;background:#2E2549;border:1px solid #382D59;border-radius:18px;padding:36px 32px;">
    <p style="letter-spacing:.18em;font-size:12px;color:#A79BC6;font-family:Arial,sans-serif;">◉ IRISIA</p>
    <p style="font-size:17px;line-height:1.7;font-style:italic;">${prenom ? "Bonsoir " + prenom + "." : "Bonsoir."}</p>
    <p style="font-size:17px;line-height:1.7;font-style:italic;">${corps}</p>
    ${bouton ? `<p style="margin-top:28px;"><a href="${bouton.lien}" style="background:#8F79EA;color:#fff;text-decoration:none;padding:13px 24px;border-radius:12px;font-family:Arial,sans-serif;font-weight:bold;font-size:15px;">${bouton.texte}</a></p>` : ""}
    <p style="margin-top:30px;font-size:15px;font-style:italic;color:#A79BC6;">— Irisia</p>
  </div>
</body></html>`;
}

export function emailPresentation(prenom) {
  return {
    sujet: "J'ai quelqu'un à vous présenter 🌿",
    html: gabarit(prenom,
      "J'ai trouvé quelqu'un pour vous. Pas un profil parmi d'autres — une personne, choisie après avoir relu vos deux portraits. Venez voir pourquoi je crois en vous deux.",
      { lien: urlApp() + "/presentations", texte: "Découvrir la présentation" }),
  };
}

export function emailMutuel(prenom, autrePrenom) {
  return {
    sujet: `${autrePrenom} a dit oui 💜`,
    html: gabarit(prenom,
      `Belle nouvelle : ${autrePrenom} et vous avez tous les deux dit oui. Votre conversation est ouverte — je vous laisse faire connaissance.`,
      { lien: urlApp() + "/presentations", texte: "Ouvrir la conversation" }),
  };
}

export function emailVerification(prenom, accepte) {
  return accepte
    ? { sujet: "Votre profil est vérifié ✓",
        html: gabarit(prenom,
          "Votre profil vient d'être vérifié. Vous faites désormais partie d'une communauté sans faux profils, sans bots, sans mauvaises surprises. Prochaine étape : notre entretien, si ce n'est pas déjà fait.",
          { lien: urlApp() + "/espace", texte: "Continuer mon parcours" }) }
    : { sujet: "Votre vérification n'a pas abouti",
        html: gabarit(prenom,
          "Je n'ai pas pu valider votre dossier cette fois — le plus souvent, c'est une question de lumière ou de geste mal visible. Recommencez tranquillement, en quelques minutes c'est réglé.",
          { lien: urlApp() + "/verification", texte: "Recommencer la vérification" }) };
}

export function emailReinitialisation(prenom, lien) {
  return {
    sujet: "Réinitialiser votre mot de passe",
    html: gabarit(prenom,
      "Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
      { lien, texte: "Choisir un nouveau mot de passe" }),
  };
}

export async function envoyerEmail({ a, sujet, html }) {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.log(`[email simulé] à: ${a} | sujet: ${sujet}\n${html}`);
    return { simule: true };
  }
  const rep = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
    body: JSON.stringify({
      from: process.env.EMAIL_EXPEDITEUR || "IRISIA <onboarding@resend.dev>",
      to: [a],
      subject: sujet,
      html,
    }),
  });
  if (!rep.ok) throw new Error(`Resend ${rep.status}: ${(await rep.text()).slice(0, 200)}`);
  return rep.json();
}
