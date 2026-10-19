import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Racine du projet : sinon Next.js prend le dossier utilisateur (autre package-lock.json) comme racine.
  outputFileTracingRoot: path.join(__dirname),
  // La base de connaissance est lue au moment de l'exécution : on l'inclut dans le déploiement.
  outputFileTracingIncludes: { "/**": ["./knowledge/**", "./brand/fonts/**"] },
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer"],
};

export default nextConfig;
