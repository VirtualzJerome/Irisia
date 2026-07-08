/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Personne ne peut afficher IRISIA dans une iframe (anti-détournement de clics)
          { key: "X-Frame-Options", value: "DENY" },
          // Le navigateur ne devine jamais les types de fichiers
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Les liens sortants ne divulguent pas les adresses internes
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Caméra et micro : uniquement pour IRISIA (le selfie vidéo), rien d'autre
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
