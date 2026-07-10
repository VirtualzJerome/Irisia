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
      ALTER TABLE presentations ADD COLUMN IF NOT EXISTS brise_glace TEXT;
      ALTER TABLE presentations ADD COLUMN IF NOT EXISTS mot_a TEXT;
      ALTER TABLE presentations ADD COLUMN IF NOT EXISTS mot_b TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS en_pause BOOLEAN NOT NULL DEFAULT false;
      CREATE TABLE IF NOT EXISTS confidences (
        id          BIGSERIAL PRIMARY KEY,
        utilisateur UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        question    TEXT NOT NULL,
        reponse     TEXT NOT NULL,
        cree_le     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_confidences ON confidences (utilisateur, id);
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS banni BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS ville TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS profession TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS taille_cm INT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS enfants TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS souhait_enfants TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS tabac TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS passions JSONB;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS reponses_prompts JSONB;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS couleur_accent TEXT;
      CREATE TABLE IF NOT EXISTS jetons_reinitialisation (
        jeton_hash  TEXT PRIMARY KEY,
        utilisateur UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        expire      TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS signalements (
        id       BIGSERIAL PRIMARY KEY,
        auteur   UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        cible    UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        motif    TEXT NOT NULL,
        traite   BOOLEAN NOT NULL DEFAULT false,
        cree_le  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE presentations ADD COLUMN IF NOT EXISTS lu_a TIMESTAMPTZ NOT NULL DEFAULT now();
      ALTER TABLE presentations ADD COLUMN IF NOT EXISTS lu_b TIMESTAMPTZ NOT NULL DEFAULT now();
      CREATE TABLE IF NOT EXISTS echecs_connexion (
        email   TEXT PRIMARY KEY,
        nb      INT NOT NULL DEFAULT 0,
        dernier TIMESTAMPTZ NOT NULL DEFAULT now()
      );
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
    `SELECT id, prenom, genre, date_naissance, portrait,
            ville, profession, taille_cm, enfants, souhait_enfants, tabac,
            passions, reponses_prompts, bio, couleur_accent
     FROM utilisateurs
     WHERE statut_verification = 'VERIFIE' AND entretien_termine = true AND banni = false AND en_pause = false`
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

export async function creerPresentation({ membreA, membreB, raison, messagePourA, messagePourB, briseGlace }) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `INSERT INTO presentations (membre_a, membre_b, raison, message_pour_a, message_pour_b, brise_glace)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [membreA, membreB, raison, messagePourA, messagePourB, briseGlace || null]
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

export async function repondrePresentation(presentationId, utilisateurId, reponse, motif, mot) {
  await assurerSchema();
  const pres = await obtenirPresentation(presentationId);
  if (!pres) return null;
  const cote = pres.membre_a === utilisateurId ? "a" : pres.membre_b === utilisateurId ? "b" : null;
  if (!cote) return null;
  const { rows } = await obtenirPool().query(
    `UPDATE presentations
     SET reponse_${cote} = $2, motif_declin_${cote} = $3, mot_${cote} = $4
     WHERE id = $1 RETURNING *`,
    [
      presentationId,
      reponse,
      reponse === "DECLINE" ? motif || null : null,
      reponse === "ACCEPTE" ? (mot || null) : null,
    ]
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

// ── Protection anti-intrusion (force brute) ──

const SEUIL_ECHECS = 8;
const FENETRE_MS = 15 * 60 * 1000;

export async function verifierBlocage(email) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "SELECT nb, dernier FROM echecs_connexion WHERE email = $1", [email]
  );
  if (!rows[0]) return 0;
  const { nb, dernier } = rows[0];
  const restant = FENETRE_MS - (Date.now() - new Date(dernier).getTime());
  if (nb >= SEUIL_ECHECS && restant > 0) return Math.ceil(restant / 60000);
  return 0;
}

export async function enregistrerEchecConnexion(email) {
  await assurerSchema();
  await obtenirPool().query(
    `INSERT INTO echecs_connexion (email, nb, dernier) VALUES ($1, 1, now())
     ON CONFLICT (email) DO UPDATE SET
       nb = CASE WHEN echecs_connexion.dernier < now() - interval '15 minutes' THEN 1 ELSE echecs_connexion.nb + 1 END,
       dernier = now()`,
    [email]
  );
}

export async function effacerEchecsConnexion(email) {
  await assurerSchema();
  await obtenirPool().query("DELETE FROM echecs_connexion WHERE email = $1", [email]);
}

// ── RGPD : suppression et export ──

export async function supprimerCompte(utilisateurId) {
  await assurerSchema();
  // ON DELETE CASCADE partout : medias, entretien, presentations et conversations suivent
  await obtenirPool().query("DELETE FROM utilisateurs WHERE id = $1", [utilisateurId]);
}

export async function exporterDonnees(utilisateurId) {
  await assurerSchema();
  const pool = obtenirPool();
  const u = (await pool.query(
    `SELECT prenom, email, date_naissance, genre, cree_le, statut_verification,
            entretien_termine, portrait FROM utilisateurs WHERE id = $1`, [utilisateurId]
  )).rows[0];
  if (!u) return null;
  const entretien = (await pool.query(
    "SELECT role, contenu, cree_le FROM messages_entretien WHERE utilisateur = $1 ORDER BY id", [utilisateurId]
  )).rows;
  const presentations = (await pool.query(
    `SELECT p.cree_le,
            CASE WHEN p.membre_a = $1 THEN p.message_pour_a ELSE p.message_pour_b END AS mot_irisia,
            CASE WHEN p.membre_a = $1 THEN p.reponse_a ELSE p.reponse_b END AS ma_reponse,
            CASE WHEN p.membre_a = $1 THEN p.motif_declin_a ELSE p.motif_declin_b END AS mon_motif
     FROM presentations p WHERE p.membre_a = $1 OR p.membre_b = $1 ORDER BY p.cree_le`, [utilisateurId]
  )).rows;
  const conversations = (await pool.query(
    `SELECT m.contenu, m.cree_le, (m.expediteur = $1) AS de_moi
     FROM messages_conversation m
     JOIN presentations p ON p.id = m.presentation
     WHERE p.membre_a = $1 OR p.membre_b = $1 ORDER BY m.id`, [utilisateurId]
  )).rows;
  return { profil: u, entretien_avec_irisia: entretien, presentations, conversations };
}

// ── Réinitialisation de mot de passe ──
import { createHash, randomBytes } from "crypto";

function hacher(jeton) {
  return createHash("sha256").update(jeton).digest("hex");
}

export async function creerJetonReinitialisation(utilisateurId) {
  await assurerSchema();
  const jeton = randomBytes(32).toString("hex");
  const pool = obtenirPool();
  await pool.query("DELETE FROM jetons_reinitialisation WHERE utilisateur = $1", [utilisateurId]);
  await pool.query(
    "INSERT INTO jetons_reinitialisation (jeton_hash, utilisateur, expire) VALUES ($1, $2, now() + interval '1 hour')",
    [hacher(jeton), utilisateurId]
  );
  return jeton;
}

export async function consommerJetonReinitialisation(jeton) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    "DELETE FROM jetons_reinitialisation WHERE jeton_hash = $1 AND expire > now() RETURNING utilisateur",
    [hacher(jeton || "")]
  );
  return rows[0]?.utilisateur || null;
}

export async function changerMotDePasse(utilisateurId, motDePasseHash) {
  await assurerSchema();
  await obtenirPool().query(
    "UPDATE utilisateurs SET mot_de_passe_hash = $2 WHERE id = $1",
    [utilisateurId, motDePasseHash]
  );
}

// ── Signalements & bannissement ──

export async function creerSignalement(auteur, cible, motif) {
  await assurerSchema();
  await obtenirPool().query(
    "INSERT INTO signalements (auteur, cible, motif) VALUES ($1, $2, $3)",
    [auteur, cible, motif]
  );
}

export async function listerSignalements() {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT s.id, s.motif, s.traite, s.cree_le,
            a.prenom AS auteur_prenom, a.email AS auteur_email,
            c.prenom AS cible_prenom, c.email AS cible_email, c.id AS cible_id, c.banni AS cible_bannie
     FROM signalements s
     JOIN utilisateurs a ON a.id = s.auteur
     JOIN utilisateurs c ON c.id = s.cible
     ORDER BY s.traite ASC, s.cree_le DESC LIMIT 100`
  );
  return rows;
}

export async function marquerSignalementTraite(id) {
  await assurerSchema();
  await obtenirPool().query("UPDATE signalements SET traite = true WHERE id = $1", [id]);
}

export async function bannir(utilisateurId) {
  await assurerSchema();
  await obtenirPool().query("UPDATE utilisateurs SET banni = true WHERE id = $1", [utilisateurId]);
  // Libérer immédiatement les partenaires : ses présentations actives se ferment
  await obtenirPool().query(
    `UPDATE presentations SET reponse_a = 'DECLINE', motif_declin_a = 'Compte suspendu'
     WHERE membre_a = $1 AND reponse_a <> 'DECLINE' AND reponse_b <> 'DECLINE'`,
    [utilisateurId]
  );
  await obtenirPool().query(
    `UPDATE presentations SET reponse_b = 'DECLINE', motif_declin_b = 'Compte suspendu'
     WHERE membre_b = $1 AND reponse_a <> 'DECLINE' AND reponse_b <> 'DECLINE'`,
    [utilisateurId]
  );
}

// ── Notifications : suivi de lecture et compteurs ──

export async function marquerConversationLue(presentationId, utilisateurId) {
  await assurerSchema();
  const pres = await obtenirPresentation(presentationId);
  if (!pres) return;
  const cote = pres.membre_a === utilisateurId ? "a" : pres.membre_b === utilisateurId ? "b" : null;
  if (!cote) return;
  await obtenirPool().query(
    `UPDATE presentations SET lu_${cote} = now() WHERE id = $1`, [presentationId]
  );
}

export async function notificationsPour(utilisateurId) {
  await assurerSchema();
  const pres = await presentationActivePour(utilisateurId);
  if (!pres) return { type: null };
  const suisA = pres.membre_a === utilisateurId;
  const maReponse = suisA ? pres.reponse_a : pres.reponse_b;
  const mutuelle = pres.reponse_a === "ACCEPTE" && pres.reponse_b === "ACCEPTE";
  if (mutuelle) {
    const autre = suisA ? pres.membre_b : pres.membre_a;
    const depuis = suisA ? pres.lu_a : pres.lu_b;
    const { rows } = await obtenirPool().query(
      `SELECT count(*)::int AS nb FROM messages_conversation
       WHERE presentation = $1 AND expediteur = $2 AND cree_le > $3`,
      [pres.id, autre, depuis]
    );
    return { type: "conversation", non_lus: rows[0].nb };
  }
  if (maReponse === "EN_ATTENTE") return { type: "presentation" };
  return { type: "attente_reponse" };
}

// ── Statistiques du tableau de bord ──

export async function statistiques() {
  await assurerSchema();
  const { rows } = await obtenirPool().query(`
    SELECT
      (SELECT count(*)::int FROM utilisateurs)                                          AS membres,
      (SELECT count(*)::int FROM utilisateurs WHERE statut_verification = 'VERIFIE')    AS verifies,
      (SELECT count(*)::int FROM utilisateurs WHERE statut_verification = 'EN_ATTENTE') AS dossiers_en_attente,
      (SELECT count(*)::int FROM utilisateurs WHERE entretien_termine)                  AS entretiens,
      (SELECT count(*)::int FROM presentations)                                         AS presentations,
      (SELECT count(*)::int FROM presentations
         WHERE reponse_a = 'ACCEPTE' AND reponse_b = 'ACCEPTE')                         AS couples,
      (SELECT count(*)::int FROM messages_conversation)                                 AS messages,
      (SELECT count(*)::int FROM signalements WHERE traite = false)                     AS signalements_ouverts
  `);
  return rows[0];
}

// ── Profil personnalisable ──

const CHAMPS_PROFIL = [
  "ville", "profession", "taille_cm", "enfants", "souhait_enfants",
  "tabac", "passions", "reponses_prompts", "bio", "couleur_accent", "en_pause",
];

export async function mettreAJourProfil(utilisateurId, champs) {
  await assurerSchema();
  const cles = Object.keys(champs).filter((c) => CHAMPS_PROFIL.includes(c));
  if (cles.length === 0) return;
  const affectations = cles.map((c, i) => `${c} = $${i + 2}`).join(", ");
  const valeurs = cles.map((c) =>
    c === "passions" || c === "reponses_prompts" ? JSON.stringify(champs[c]) : champs[c]
  );
  await obtenirPool().query(
    `UPDATE utilisateurs SET ${affectations} WHERE id = $1`,
    [utilisateurId, ...valeurs]
  );
}

export function profilPublicDe(u) {
  return {
    ville: u.ville || null,
    profession: u.profession || null,
    taille_cm: u.taille_cm || null,
    enfants: u.enfants || null,
    souhait_enfants: u.souhait_enfants || null,
    tabac: u.tabac || null,
    passions: u.passions || [],
    reponses_prompts: u.reponses_prompts || [],
    bio: u.bio || null,
    couleur_accent: u.couleur_accent || "iris",
  };
}

// ── Les confidences : le portrait qui vit ──

const QUESTIONS_CONFIDENCE = [
  "Qu'est-ce que vos amis viennent chercher chez vous ?",
  "Quelle petite attention vous touche le plus ?",
  "Qu'avez-vous appris de votre dernière relation ?",
  "Votre définition d'une belle soirée ?",
  "Ce que les gens devinent rarement de vous ?",
  "Le compliment qui vous a le plus marqué ?",
  "Qu'est-ce qui vous apaise instantanément ?",
  "Votre madeleine de Proust ?",
  "La qualité que vous ne négociez pas chez quelqu'un ?",
  "Une chose que vous aimeriez oser un jour ?",
  "Devant quoi êtes-vous incapable de dire non ?",
  "Qu'est-ce qui vous a fait sourire cette semaine ?",
];

const DELAI_CONFIDENCE_H = 20; // au plus une par ~journée

export async function prochaineConfidence(utilisateurId) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT question, cree_le FROM confidences
     WHERE utilisateur = $1 ORDER BY id DESC`,
    [utilisateurId]
  );
  if (rows[0]) {
    const heures = (Date.now() - new Date(rows[0].cree_le).getTime()) / 3600000;
    if (heures < DELAI_CONFIDENCE_H) return null; // Irisia reviendra demain
  }
  const posees = new Set(rows.map((r) => r.question));
  const restantes = QUESTIONS_CONFIDENCE.filter((q) => !posees.has(q));
  if (restantes.length === 0) return null; // toutes posées
  return restantes[Math.floor(Math.random() * restantes.length)];
}

export async function enregistrerConfidence(utilisateurId, question, reponse) {
  await assurerSchema();
  if (!QUESTIONS_CONFIDENCE.includes(question)) return false;
  await obtenirPool().query(
    "INSERT INTO confidences (utilisateur, question, reponse) VALUES ($1, $2, $3)",
    [utilisateurId, question, reponse]
  );
  return true;
}

export async function dernieresConfidences(utilisateurId, limite = 5) {
  await assurerSchema();
  const { rows } = await obtenirPool().query(
    `SELECT question, reponse FROM confidences
     WHERE utilisateur = $1 ORDER BY id DESC LIMIT $2`,
    [utilisateurId, limite]
  );
  return rows;
}
