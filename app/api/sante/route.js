import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const rapport = {};
  const url = process.env.DATABASE_URL || "";

  if (!url) {
    rapport.DATABASE_URL = "❌ ABSENTE";
  } else if (url.includes("railway.internal")) {
    rapport.DATABASE_URL = "❌ ADRESSE INTERNE — il faut DATABASE_PUBLIC_URL";
  } else {
    rapport.DATABASE_URL = "présente — détail ci-dessous";
  }
  try {
    const u = new URL(url.replace(/^postgres(ql)?:\/\//, "http://"));
    rapport.hote_configure = u.hostname || "(vide)";
    rapport.port_configure = u.port || "(vide — il manque le numéro !)";
    rapport.fin_de_valeur = JSON.stringify(url.slice(-14));
  } catch {
    rapport.hote_configure = "❌ illisible — la valeur n'est pas une adresse valide";
  }

  const secret = process.env.SESSION_SECRET || "";
  rapport.SESSION_SECRET = !secret ? "❌ ABSENTE" : secret.length < 20 ? "❌ TROP COURTE" : "✅";
  rapport.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ? "✅" : "⚠️ absente";

  if (url && !url.includes("railway.internal")) {
    const pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      max: 1,
    });
    try {
      await pool.query("SELECT 1");
      rapport.connexion_base = "✅ CONNEXION RÉUSSIE";
    } catch (e) {
      rapport.connexion_base = `❌ ÉCHEC : ${e.message}`;
    } finally {
      pool.end().catch(() => {});
    }
  }

  return NextResponse.json(rapport);
}
