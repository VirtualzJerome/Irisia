export default function manifest() {
  return {
    name: "IRISIA — l'entremetteuse",
    short_name: "IRISIA",
    description:
      "Pas un catalogue de visages. Une vraie rencontre. Irisia, votre entremetteuse IA, ne vous présente que des personnes vérifiées, choisies pour vous.",
    start_url: "/espace",
    display: "standalone",
    background_color: "#251D38",
    theme_color: "#251D38",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
