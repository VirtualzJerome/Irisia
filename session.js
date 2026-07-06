// ─────────────────────────────────────────────
// Gestion des sessions IRISIA
// Un jeton signé (JWT) stocké dans un cookie
// httpOnly : illisible par le JavaScript du
// navigateur, donc protégé contre le vol.
// ─────────────────────────────────────────────
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const NOM_COOKIE = "irisia_session";
const DUREE_JOURS = 30;

function cle() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 20) {
    throw new Error("SESSION_SECRET manquant ou trop court (20 caractères minimum).");
  }
  return new TextEncoder().encode(secret);
}

export async function creerSession(userId) {
  const jeton = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_JOURS}d`)
    .sign(cle());

  cookies().set(NOM_COOKIE, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DUREE_JOURS * 24 * 60 * 60,
    path: "/",
  });
}

export async function lireSession() {
  const jeton = cookies().get(NOM_COOKIE)?.value;
  if (!jeton) return null;
  try {
    const { payload } = await jwtVerify(jeton, cle());
    return payload; // { userId }
  } catch {
    return null;
  }
}

export function supprimerSession() {
  cookies().delete(NOM_COOKIE);
}
