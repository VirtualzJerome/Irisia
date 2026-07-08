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
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_recherche TIMESTAMPTZ;
      CREATE TABLE IF NOT EXISTS presentations (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        membre_a       UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        membre_b       UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        raison         TEXT,
        message_pour_a TEXT,
        message_pour_b TEXT,
        reponse_a      TEXT NOT NULL DEFAULT 'EN_ATTENTE',
        reponse_b      TEXT NOT NULL DEFAULT 'EN_ATTENTE',
        motif_declin_a TEXT,
        motif_declin_b TEXT,
        cree_le        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_presentations_a ON presentations (membre_a, cree_le);
      CREATE INDEX IF NOT EXISTS idx_presentations_b ON presentations (membre_b, cree_le);
      CREATE TABLE IF NOT EXISTS messages_conversation (
        id           BIGSERIAL PRIMARY KEY,
        presentation UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
        expediteur   UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        contenu      TEXT NOT NULL,
        cree_le      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_conv ON messages_conversation (presentation, id);
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

// ── Le moteur de présentations ──

export async function membresPrets() {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT id, prenom, genre, date_naissance, portrait
     FROM utilisateurs
     WHERE statut_verification = 'VERIFIE' AND entretien_termine = true`
  );
  return rows;
}

// Présentation "active" = aucun des deux n'a décliné
export async function presentationActivePour(utilisateurId) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT * FROM presentations
     WHERE (membre_a = $1 OR membre_b = $1)
       AND reponse_a <> 'DECLINE' AND reponse_b <> 'DECLINE'
     ORDER BY cree_le DESC LIMIT 1`,
    [utilisateurId]
  );
  return rows[0] || null;
}

export async function dejaPresentes(a, b) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT 1 FROM presentations
     WHERE (membre_a = $1 AND membre_b = $2) OR (membre_a = $2 AND membre_b = $1)
     LIMIT 1`,
    [a, b]
  );
  return rows.length > 0;
}

export async function creerPresentation({ membreA, membreB, raison, messagePourA, messagePourB }) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `INSERT INTO presentations (membre_a, membre_b, raison, message_pour_a, message_pour_b)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [membreA, membreB, raison, messagePourA, messagePourB]
  );
  return rows[0];
}

export async function obtenirPresentation(id) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "SELECT * FROM presentations WHERE id = $1", [id]
  );
  return rows[0] || null;
}

export async function repondrePresentation(presentationId, utilisateurId, reponse, motif) {
  await assurerSchema();
  const pres = await obtenirPresentation(presentationId);
  if (!pres) return null;
  const cote = pres.membre_a === utilisateurId ? "a" : pres.membre_b === utilisateurId ? "b" : null;
  if (!cote) return null;
  const { rows } = await obtenirPool().query(
    `UPDATE presentations
     SET reponse_${cote} = $2, motif_declin_${cote} = $3
     WHERE id = $1 RETURNING *`,
    [presentationId, reponse, reponse === "DECLINE" ? motif || null : null]
  );
  return rows[0];
}

export async function derniersMotifsDeclin(utilisateurId, limite = 3) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT CASE WHEN membre_a = $1 THEN motif_declin_a ELSE motif_declin_b END AS motif
     FROM presentations
     WHERE ((membre_a = $1 AND reponse_a = 'DECLINE' AND motif_declin_a IS NOT NULL)
         OR (membre_b = $1 AND reponse_b = 'DECLINE' AND motif_declin_b IS NOT NULL))
     ORDER BY cree_le DESC LIMIT $2`,
    [utilisateurId, limite]
  );
  return rows.map((r) => r.motif).filter(Boolean);
}

export async function marquerRecherche(utilisateurId) {
  await assurerSchema();
  await obtenirPool().query(
    "UPDATE utilisateurs SET derniere_recherche = now() WHERE id = $1",
    [utilisateurId]
  );
}

export async function partagentPresentationActive(u1, u2) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT 1 FROM presentations
     WHERE ((membre_a = $1 AND membre_b = $2) OR (membre_a = $2 AND membre_b = $1))
       AND reponse_a <> 'DECLINE' AND reponse_b <> 'DECLINE'
     LIMIT 1`,
    [u1, u2]
  );
  return rows.length > 0;
}

// Verrou consultatif : évite deux recherches simultanées pour le même membre
export async function verrouRecherche(utilisateurId) {
  const { rows } = await obtenirPool().query(
    "SELECT pg_try_advisory_lock(hashtext($1)) AS ok", [utilisateurId]
  );
  return rows[0].ok;
}
export async function libererVerrouRecherche(utilisateurId) {
  await obtenirPool().query("SELECT pg_advisory_unlock(hashtext($1))", [utilisateurId]).catch(() => {});
}

// ── Conversation entre deux membres présentés ──

export async function listerMessagesConversation(presentationId, apresId = 0) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT id, expediteur, contenu, cree_le FROM messages_conversation
     WHERE presentation = $1 AND id > $2 ORDER BY id ASC LIMIT 200`,
    [presentationId, apresId]
  );
  return rows;
}

export async function ajouterMessageConversation(presentationId, expediteur, contenu) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `INSERT INTO messages_conversation (presentation, expediteur, contenu)
     VALUES ($1, $2, $3) RETURNING id, expediteur, contenu, cree_le`,
    [presentationId, expediteur, contenu]
  );
  return rows[0];
}
