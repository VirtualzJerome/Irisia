import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const rapport = {};

  const url = process.env.DATABASE_URL || "";
  if (!url) {
    rapport.DATABASE_URL = "❌ ABSENTE — ajoutez la variable sur Vercel";
  } else if (url.includes("railway.internal")) {
    rapport.DATABASE_URL =
      "❌ ADRESSE INTERNE — vous avez copié DATABASE_URL de Railway ; il faut la valeur de DATABASE_PUBLIC_URL (contient proxy.rlwy.net)";
  } else if (url.includes("rlwy.net")) {
    rapport.DATABASE_URL = "✅ présente (adresse publique Railway)";
  } else if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    rapport.DATABASE_URL = "❌ FORMAT INATTENDU — la valeur doit commencer par postgresql://";
  } else {
    rapport.DATABASE_URL = "⚠️ présente, hôte inhabituel (ni rlwy.net ni railway.internal)";
  }

  const secret = process.env.SESSION_SECRET || "";
  rapport.SESSION_SECRET = !secret
    ? "❌ ABSENTE — ajoutez la variable sur Vercel"
    : secret.length < 20
    ? `❌ TROP COURTE (${secret.length} caractères — 20 minimum)`
    : "✅ présente";

  rapport.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    ? "✅ présente"
    : "⚠️ absente — nécessaire pour l'entretien avec Irisia";

  if (url && !url.includes("railway.internal")) {
    const pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      max: 1,
    });
    try {
      await pool.query("SELECT 1");
      rapport.connexion_base = "✅ CONNEXION RÉUSSIE — la base Railway répond";
    } catch (e) {
      rapport.connexion_base = `❌ ÉCHEC : ${e.message}`;
    } finally {
      pool.end().catch(() => {});
    }
  } else {
    rapport.connexion_base = "⏭ non testée (corrigez d'abord DATABASE_URL)";
  }

  return NextResponse.json(rapport);
}
