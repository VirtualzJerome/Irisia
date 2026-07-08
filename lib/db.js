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
async function assurerSchema() {
  if (!globalPourDb._irisiaSchema) {
    globalPourDb._irisiaSchema = obtenirPool().query(`
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
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS portrait JSONB;
      CREATE TABLE IF NOT EXISTS messages_entretien (
        id           BIGSERIAL PRIMARY KEY,
        utilisateur  UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        role         TEXT NOT NULL,
        contenu      TEXT NOT NULL,
        cree_le      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_entretien_utilisateur
        ON messages_entretien (utilisateur, id);
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS geste_demande TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS verification_soumise_le TIMESTAMPTZ;
      CREATE TABLE IF NOT EXISTS medias (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        utilisateur UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        type        TEXT NOT NULL,
        mime        TEXT NOT NULL,
        donnees     BYTEA NOT NULL,
        cree_le     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_medias_utilisateur ON medias (utilisateur, type);
    `);
  }
  try {
    await globalPourDb._irisiaSchema;
  } catch (e) {
    globalPourDb._irisiaSchema = null; // on oubliera cet échec : nouvelle tentative au prochain appel
    throw e;
  }
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

// ── Entretien avec Irisia ──

export async function listerMessagesEntretien(utilisateurId) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "SELECT role, contenu FROM messages_entretien WHERE utilisateur = $1 ORDER BY id ASC",
    [utilisateurId]
  );
  return rows;
}

export async function ajouterMessageEntretien(utilisateurId, role, contenu) {
  await assurerSchema();
  await obtenirPool().query(
    "INSERT INTO messages_entretien (utilisateur, role, contenu) VALUES ($1, $2, $3)",
    [utilisateurId, role, contenu]
  );
}

export async function terminerEntretien(utilisateurId, portrait) {
  await assurerSchema();
  await obtenirPool().query(
    "UPDATE utilisateurs SET entretien_termine = true, portrait = $2 WHERE id = $1",
    [utilisateurId, portrait]
  );
}

// ── Vérification photo & vidéo ──

export async function definirGeste(utilisateurId, geste) {
  await assurerSchema();
  await obtenirPool().query(
    "UPDATE utilisateurs SET geste_demande = $2 WHERE id = $1",
    [utilisateurId, geste]
  );
}

export async function listerMedias(utilisateurId) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "SELECT id, type, mime, octet_length(donnees) AS taille, cree_le FROM medias WHERE utilisateur = $1 ORDER BY cree_le",
    [utilisateurId]
  );
  return rows;
}

export async function ajouterMedia(utilisateurId, type, mime, donnees) {
  await assurerSchema();
  if (type === "video") {
    // Une seule vidéo par membre : la nouvelle remplace l'ancienne
    await obtenirPool().query(
      "DELETE FROM medias WHERE utilisateur = $1 AND type = 'video'",
      [utilisateurId]
    );
  }
  const { rows } = await obtenirPool().query(
    "INSERT INTO medias (utilisateur, type, mime, donnees) VALUES ($1, $2, $3, $4) RETURNING id",
    [utilisateurId, type, mime, donnees]
  );
  return rows[0].id;
}

export async function obtenirMedia(id) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "SELECT * FROM medias WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

export async function supprimerMedia(id, utilisateurId) {
  await assurerSchema();
  const { rowCount } = await obtenirPool().query(
    "DELETE FROM medias WHERE id = $1 AND utilisateur = $2",
    [id, utilisateurId]
  );
  return rowCount > 0;
}

export async function soumettreVerification(utilisateurId) {
  await assurerSchema();
  await obtenirPool().query(
    "UPDATE utilisateurs SET statut_verification = 'EN_ATTENTE', verification_soumise_le = now() WHERE id = $1",
    [utilisateurId]
  );
}

export async function listerEnAttente() {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT id, prenom, email, genre, date_naissance, geste_demande, verification_soumise_le
     FROM utilisateurs WHERE statut_verification = 'EN_ATTENTE'
     ORDER BY verification_soumise_le ASC`
  );
  return rows;
}

export async function deciderVerification(utilisateurId, statut) {
  await assurerSchema();
  await obtenirPool().query(
    "UPDATE utilisateurs SET statut_verification = $2 WHERE id = $1",
    [utilisateurId, statut]
  );
}
