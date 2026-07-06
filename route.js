import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { trouverParEmail, creerUtilisateur } from "../../../lib/db";
import { creerSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

function ageDepuis(dateNaissance) {
  const auj = new Date();
  const naissance = new Date(dateNaissance);
  let age = auj.getFullYear() - naissance.getFullYear();
  const m = auj.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && auj.getDate() < naissance.getDate())) age--;
  return age;
}

export async function POST(req) {
  try {
    const { prenom, email, motDePasse, dateNaissance, genre, consentement } = await req.json();

    if (!prenom || prenom.trim().length < 2)
      return NextResponse.json({ erreur: "Indiquez votre prénom." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || ""))
      return NextResponse.json({ erreur: "Cette adresse e-mail semble incomplète." }, { status: 400 });
    if (!motDePasse || motDePasse.length < 8)
      return NextResponse.json({ erreur: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    if (!dateNaissance || isNaN(new Date(dateNaissance).getTime()))
      return NextResponse.json({ erreur: "Indiquez votre date de naissance." }, { status: 400 });
    if (ageDepuis(dateNaissance) < 18)
      return NextResponse.json({ erreur: "IRISIA est réservé aux personnes majeures." }, { status: 400 });
    if (ageDepuis(dateNaissance) > 110)
      return NextResponse.json({ erreur: "Vérifiez votre date de naissance." }, { status: 400 });
    if (consentement !== true)
      return NextResponse.json({ erreur: "Vous devez accepter la politique de confidentialité." }, { status: 400 });

    const emailPropre = email.trim().toLowerCase();
    if (await trouverParEmail(emailPropre))
      return NextResponse.json({ erreur: "Un compte existe déjà avec cette adresse. Connectez-vous." }, { status: 409 });

    const utilisateur = await creerUtilisateur({
      email: emailPropre,
      motDePasseHash: await bcrypt.hash(motDePasse, 10),
      prenom: prenom.trim(),
      dateNaissance,
      genre: genre || null,
    });

    await creerSession(utilisateur.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur inscription:", e);
    return NextResponse.json({ erreur: "Une erreur est survenue. Réessayez dans un instant." }, { status: 500 });
  }
}
