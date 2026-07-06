// ─────────────────────────────────────────────
// IRISIA — Accès base de données (PostgreSQL / Railway)
// La table se crée toute seule au premier démarrage :
// aucune migration à lancer à la main.
// ─────────────────────────────────────────────
import { Pool } from "pg";

const globalPourDb = globalThis;

function creerPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant : ajoutez la variable d'environnement.");
  const locale = url.includes("localhost") || url.includes("127.0.0.1");
  return new Pool({
    connectionString: url,
    ssl: locale ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

function obtenirPool() {
  if (!globalPourDb._irisiaPool) globalPourDb._irisiaPool = creerPool();
  return globalPourDb._irisiaPool;
}

// ── Création du schéma (une seule fois par démarrage) ──
let schemaPret = globalPourDb._irisiaSchema ?? null;

async function assurerSchema() {
  if (!schemaPret) {
    schemaPret = obtenirPool().query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email               TEXT UNIQUE NOT NULL,
        mot_de_passe_hash   TEXT NOT NULL,
        prenom              TEXT NOT NULL,
        date_naissance      DATE NOT NULL,
        genre               TEXT,
        cree_le             TIMESTAMPTZ NOT NULL DEFAULT now(),
        statut_verification TEXT NOT NULL DEFAULT 'NON_VERIFIE',
        entretien_termine   BOOLEAN NOT NULL DEFAULT false
      );
    `);
    globalPourDb._irisiaSchema = schemaPret;
  }
  await schemaPret;
}

// ── Fonctions utilisées par l'application ──

export async function trouverParEmail(email) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "SELECT * FROM utilisateurs WHERE email = $1",
    [email]
  );
  return rows[0] || null;
}

export async function trouverParId(id) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "SELECT * FROM utilisateurs WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

export async function creerUtilisateur({ email, motDePasseHash, prenom, dateNaissance, genre }) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `INSERT INTO utilisateurs (email, mot_de_passe_hash, prenom, date_naissance, genre)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [email, motDePasseHash, prenom, dateNaissance, genre]
  );
  return rows[0];
}
