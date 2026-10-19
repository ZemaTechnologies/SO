// Détection de l'opportunité ZEMA principale et score du prospect (0-100).
// Règles issues de la base de connaissance (section 8). Ajustables.

import type { SiteAnalysis } from "./analyze-site";

export type ProspectSignals = {
  sector?: string;                // immobilier, btp, services_pro
  hasEmail: boolean;
  hasPhone: boolean;
  hasDecisionMaker: boolean;
  rating?: number;
  ratingCount?: number;           // nb d'avis Google : indice d'activité
  socialActive?: boolean;         // renseigné quand l'analyse réseaux existe
};

export type Opportunity = { offer: string; reason: string };

export function detectOpportunity(site: SiteAnalysis, s: ProspectSignals): Opportunity {
  if (!site.siteExists) {
    return s.sector === "immobilier"
      ? { offer: "Site vitrine IA avec catalogue de biens", reason: "Aucun site : les biens ne sont visibles que sur les réseaux ou par téléphone." }
      : { offer: "Site vitrine IA", reason: "Aucun site web : l'entreprise est difficile à trouver et à vérifier en ligne." };
  }
  if (site.blocked) return { offer: "À déterminer après vérification manuelle", reason: "Le site bloque l'analyse automatique." };
  if (!site.siteUp) return { offer: "Refonte du site", reason: "Le site actuel ne fonctionne pas." };
  const outdated = !site.https || !site.mobileFriendly || (site.performanceScore ?? 100) < 40 ||
    (site.copyrightYear !== undefined && site.copyrightYear < new Date().getFullYear() - 2);
  if (outdated) {
    return s.sector === "btp"
      ? { offer: "Refonte du site avec portfolio de réalisations", reason: "Site ancien, peu sécurisé ou inadapté au mobile, alors que les références rassurent les clients du BTP." }
      : { offer: "Refonte du site (site vitrine IA)", reason: "Site ancien, peu sécurisé, lent ou inadapté au mobile." };
  }
  if (!site.hasContactForm && !site.hasClearCta) {
    return { offer: "Site + génération de prospects", reason: "Le site ne propose aucun moyen simple de demander un devis ou un rendez-vous." };
  }
  if (!site.hasWhatsappLink && s.hasPhone) {
    return { offer: "Bot WhatsApp et automatisation", reason: "Les clients doivent appeler ou écrire sans réponse automatique ni qualification." };
  }
  if (s.socialActive === false || (!site.socials.facebook && !site.socials.instagram)) {
    return { offer: "Community management & contenu", reason: "Site correct mais présence sur les réseaux absente ou inactive." };
  }
  return { offer: "Automatisation (relances, suivi des prospects)", reason: "Présence digitale correcte : le gain se trouve dans l'automatisation du suivi commercial." };
}

export type ScoreDetails = Record<string, number>;

/** Score sur 100. 70+ = prospect prioritaire. */
export function scoreProspect(site: SiteAnalysis, s: ProspectSignals): { score: number; details: ScoreDetails } {
  const d: ScoreDetails = {};

  // Besoin détecté (35) : plus il y a de problèmes, plus le besoin est fort
  d.besoin = site.blocked ? 10 : Math.min(35, site.siteExists ? site.issues.length * 6 : 30);

  // Adéquation ZEMA (20) : secteurs prioritaires
  d.adequation = s.sector && ["immobilier", "btp", "services_pro"].includes(s.sector) ? 20 : 10;

  // Qualité du contact (20)
  d.contact = (s.hasEmail ? 10 : 0) + (s.hasPhone ? 5 : 0) + (s.hasDecisionMaker ? 5 : 0);

  // Activité et capacité estimée (15) : avis Google, site en ligne
  const reviews = s.ratingCount ?? 0;
  d.activite = Math.min(10, Math.round(reviews / 5)) + (site.siteUp ? 5 : 0);

  // Urgence apparente (10)
  d.urgence = (!site.siteExists || !site.siteUp ? 10 : !site.https || !site.mobileFriendly ? 6 : 2);

  const score = Math.max(0, Math.min(100, Object.values(d).reduce((a, b) => a + b, 0)));
  return { score, details: d };
}
