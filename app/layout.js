import "./globals.css";

export const metadata = {
  title: "IRISIA — Pas un catalogue de visages. Une vraie rencontre.",
  description:
    "Irisia, votre entremetteuse IA, apprend à vous connaître dès l'inscription et ne vous présente que des personnes vérifiées, choisies pour vous.",
  icons: { icon: "/icone-192.png", apple: "/icone-192.png" },
  appleWebApp: { capable: true, title: "IRISIA", statusBarStyle: "black-translucent" },
};

export const viewport = {
  themeColor: "#251D38",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,560;1,9..144,400&family=Karla:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
