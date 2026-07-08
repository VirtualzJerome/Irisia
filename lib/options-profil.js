// ─────────────────────────────────────────────
// IRISIA — Options du profil (partagées client/serveur)
// ─────────────────────────────────────────────

export const PASSIONS = [
  "Randonnée", "Cuisine", "Voyages", "Cinéma", "Lecture", "Musique",
  "Sport", "Yoga", "Danse", "Nature", "Animaux", "Photographie",
  "Jeux de société", "Jeux vidéo", "Art", "Concerts", "Gastronomie", "Vin",
  "Bricolage", "Jardinage", "Moto", "Montagne", "Mer", "Bénévolat",
];
export const MAX_PASSIONS = 6;

export const PROMPTS = [
  "Mon dimanche parfait…",
  "Je suis inexplicablement doué·e pour…",
  "La chose qui me fait rire à coup sûr…",
  "Mon crime culinaire assumé…",
  "Le voyage qui m'a marqué·e…",
  "Je cherche quelqu'un qui…",
  "On s'entendra bien si…",
  "Ma petite victoire de la semaine…",
];
export const MAX_PROMPTS = 3;
export const LONGUEUR_MAX_REPONSE = 150;

export const COULEURS = {
  iris:  "#8F79EA",
  lueur: "#D8B45C",
  sauge: "#8FBF9F",
  rose:  "#E8A9C0",
  ciel:  "#7FB4E8",
};

export const OPTIONS_ENFANTS = [
  { valeur: "aucun", etiquette: "Pas d'enfant" },
  { valeur: "oui", etiquette: "J'ai des enfants" },
  { valeur: "prefere_en_parler", etiquette: "Je préfère en parler" },
];

export const OPTIONS_SOUHAIT_ENFANTS = [
  { valeur: "oui", etiquette: "J'en veux" },
  { valeur: "non", etiquette: "Je n'en veux pas" },
  { valeur: "ouvert", etiquette: "Ouvert·e à la discussion" },
];

export const OPTIONS_TABAC = [
  { valeur: "non", etiquette: "Non-fumeur·se" },
  { valeur: "occasionnel", etiquette: "Occasionnellement" },
  { valeur: "oui", etiquette: "Fumeur·se" },
];

export function etiquettePour(options, valeur) {
  return options.find((o) => o.valeur === valeur)?.etiquette || null;
}

// Complétude du profil : 10 critères, un pourcentage
export function calculerCompletude(profil, nbPhotos) {
  const criteres = [
    nbPhotos >= 2,
    !!profil.bio,
    !!profil.ville,
    !!profil.profession,
    !!profil.taille_cm,
    !!profil.enfants,
    !!profil.souhait_enfants,
    !!profil.tabac,
    Array.isArray(profil.passions) && profil.passions.length >= 3,
    Array.isArray(profil.reponses_prompts) && profil.reponses_prompts.length >= 2,
  ];
  return Math.round((criteres.filter(Boolean).length / criteres.length) * 100);
}
