// Un membre est administrateur si son email correspond à ADMIN_EMAIL (variable Vercel).
// Accepte indifféremment un objet utilisateur ou un email en texte.
export function estAdmin(utilisateurOuEmail) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) return false;
  const email =
    typeof utilisateurOuEmail === "string"
      ? utilisateurOuEmail
      : utilisateurOuEmail?.email;
  return (email || "").trim().toLowerCase() === adminEmail;
}
