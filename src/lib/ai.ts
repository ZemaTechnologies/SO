// Appels à l'API Claude : rédaction des e-mails, aperçu personnalisé, classement des réponses.

import type { SiteAnalysis } from "./analyze-site";
import type { Opportunity } from "./score";
import type { MockupContent } from "./mockup";

const API_URL = "https://api.anthropic.com/v1/messages";

async function claude(system: string, user: string, maxTokens = 1500): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante dans .env.local");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      // Requis seulement si la clé n'est pas rattachée à un workspace de la console Claude.
      ...(process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : {}),
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`API Claude ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  return data.content.filter((c) => c.type === "text").map((c) => c.text).join("");
}

function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Réponse IA sans JSON");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export type ProspectContext = {
  company: string;
  sector?: string;
  district?: string;
  decisionMaker?: string;
  decisionMakerRole?: string;
  website?: string;
  site: SiteAnalysis;
  opportunity: Opportunity;
  previewUrl?: string;
  googleReviews?: number;
};

export type EmailDraft = { subject: string; body: string };

/** Premier e-mail (step 0) ou relances (step 1, 2) qui apportent chacune quelque chose de nouveau. */
export async function draftEmail(knowledge: string, p: ProspectContext, step: 0 | 1 | 2, history: string[] = []): Promise<EmailDraft> {
  const system = `Tu es l'assistant commercial de ZEMA TECHNOLOGIES (Abidjan). Tu rédiges des e-mails de prospection B2B en français, au nom de Michael ZEBA, fondateur, en respectant strictement sa structure.

BASE DE CONNAISSANCE ZEMA :
${knowledge}

RÈGLES GÉNÉRALES :
- Vouvoiement, français soigné, ton professionnel et chaleureux, jamais insistant.
- E-mail entièrement personnalisé sur le prospect : ne jamais mettre en avant des résultats ou des noms d'autres clients ZEMA.
- N'inventer aucun chiffre, aucune réalisation, aucun prix. Ne s'appuyer que sur les données fournies (constats, avis Google, réseaux, secteur, commune).
- Proposer UNE seule offre : celle indiquée dans "opportunite". Ne jamais lister le catalogue.
- Fil rouge de tout l'e-mail : montrer au prospect que la solution lui apporte de nouveaux clients et fait progresser son chiffre d'affaires (plus de demandes, plus de visites, plus de ventes ou de contrats signés). Formuler ces gains de façon concrète et crédible, sans chiffres inventés.
- Texte brut (pas de Markdown, pas de gras). Paragraphes séparés par une ligne vide.

OBJET :
- Énoncer directement le problème et la solution, de façon concrète, ET créer l'urgence : faire sentir ce que le prospect perd chaque jour sans la solution (clients, demandes, ventes qui partent chez la concurrence). 70 caractères maximum.
- Exemples : « Chaque jour sans site, vos acheteurs partent ailleurs : agissons » ; « Vos demandes WhatsApp sans réponse la nuit = clients perdus ».
- Urgence honnête uniquement : pas de fausse date limite, pas de fausse promotion, pas de MAJUSCULES, pas de « URGENT », pas de points d'exclamation (filtres anti-spam).

FORMULE D'APPEL :
- « Madame, Monsieur, » quand le nom du décideur n'est pas connu. Sinon « Madame X, » ou « Monsieur X, » si le genre est évident, à défaut « Madame, Monsieur, ».

PREMIER E-MAIL (step 0) — exactement 5 paragraphes distincts :
1) Introduction courte (1 à 2 phrases) qui valorise une réalisation ou un atout réel du prospect (activité visible, avis Google, présence dans sa commune, réseaux…).
2) Constat court et direct (1 à 2 phrases) tiré de l'analyse, et sa conséquence concrète sur son activité (clients perdus, demandes en moins, crédibilité).
3) La solution ZEMA détaillée point par point : une phrase d'introduction qui la présente comme un investissement rentable (plus de clients, chiffre d'affaires en hausse), jamais comme une charge ; puis 3 ou 4 points, chacun sur sa propre ligne commençant par « • » et séparé du suivant par une ligne vide. Chaque point associe une fonctionnalité à son gain commercial concret (ex. : « … pour transformer vos visiteurs en demandes de visite »).
4) Annonce de l'élément visuel : une maquette préparée spécialement pour l'entreprise, visible en image en bas de cet e-mail, présentée comme la preuve concrète de ce que ZEMA propose. Si un lien est fourni (lien_apercu), ajouter en une phrase qu'il détaille nos recommandations.
5) Conclusion en une seule phrase, du type « Je serais ravi d'échanger avec vous à ce sujet. » — sans durée, sans créneau, sans date.

RELANCES :
- Relance 1 (step 1) : même formule d'appel ; 3 paragraphes courts : rappel bref du constat, une idée concrète nouvelle liée à l'opportunité, rappel du lien de l'aperçu ; conclusion en une phrase sans durée ni créneau. Ne jamais reprocher l'absence de réponse.
- Relance 2 (step 2) : message court de clôture (2 paragraphes), qui laisse la porte ouverte ; conclusion en une phrase.

À LA FIN DE CHAQUE E-MAIL :
- « Cordialement, » puis la signature sur des lignes séparées : Michael ZEBA / Fondateur — ZEMA TECHNOLOGIES / +225 07 15 18 35 68 / www.zematechnologies.com
Réponds UNIQUEMENT en JSON : {"subject": "...", "body": "..."}`;

  const user = JSON.stringify({
    step,
    entreprise: p.company,
    secteur: p.sector,
    commune: p.district,
    decideur: p.decisionMaker ? `${p.decisionMaker} (${p.decisionMakerRole ?? "fonction inconnue"})` : null,
    site: p.website ?? null,
    avis_google: p.googleReviews ?? null,
    constats: p.site.issues,
    seo: p.site.seo,
    reseaux: p.site.socials,
    opportunite: p.opportunity,
    lien_apercu: p.previewUrl ?? null,
    messages_precedents: history,
  });
  return parseJson<EmailDraft>(await claude(system, user, 1200));
}

export type PreviewContent = {
  headline: string;
  observations: string[];
  opportunity: string;
  whatWeWouldDo: string[];
  expectedBenefits: string[];
  cta: string;
};

/** Contenu de la page « aperçu personnalisé » envoyée au prospect. */
export async function draftPreview(knowledge: string, p: ProspectContext): Promise<PreviewContent> {
  const system = `Tu prépares une page d'aperçu personnalisée que ZEMA TECHNOLOGIES envoie à un prospect.
BASE DE CONNAISSANCE : ${knowledge}
Règles : français, vouvoiement, factuel, positif (jamais dénigrant), aucune donnée inventée, aucun prix.
3 à 5 observations précises tirées de l'analyse, 3 à 4 actions concrètes que ZEMA ferait, 2 à 3 bénéfices attendus, centrés sur les nouveaux clients et la hausse du chiffre d'affaires, formulés sans chiffres inventés. Le cta invite simplement à échanger, sans durée ni créneau. Ne jamais citer d'autres clients.
Réponds UNIQUEMENT en JSON : {"headline":"...","observations":["..."],"opportunity":"...","whatWeWouldDo":["..."],"expectedBenefits":["..."],"cta":"..."}`;
  const user = JSON.stringify({
    entreprise: p.company, secteur: p.sector, site: p.website, constats: p.site.issues,
    seo: p.site.seo, reseaux: p.site.socials, opportunite: p.opportunity,
  });
  return parseJson<PreviewContent>(await claude(system, user, 1200));
}

export type ReplyClassification = {
  classification: "interesse" | "a_relancer" | "demande_infos" | "pas_maintenant" | "refus" | "ne_plus_contacter";
  isHot: boolean;
  summary: string;
  followUpDate?: string;   // AAAA-MM-JJ si le prospect demande de revenir plus tard
  need?: string;
};

/** Classe la réponse d'un prospect et détecte les leads chauds. */
export async function classifyReply(replyText: string, company: string): Promise<ReplyClassification> {
  const today = new Date().toISOString().slice(0, 10);
  const system = `Tu classes la réponse d'un prospect à un e-mail de prospection de ZEMA TECHNOLOGIES. Date du jour : ${today}.
Classes possibles : interesse, a_relancer, demande_infos, pas_maintenant, refus, ne_plus_contacter.
- "STOP", « ne plus m'écrire », désinscription → ne_plus_contacter.
- isHot = true si le prospect demande un prix, un rendez-vous, un appel, une démo, ou exprime clairement un intérêt.
- Si le prospect demande de revenir à une date ou un mois précis, renseigne followUpDate (AAAA-MM-JJ, le 1er du mois si seul le mois est donné).
- need : le besoin exprimé, en quelques mots, sinon omis.
Réponds UNIQUEMENT en JSON : {"classification":"...","isHot":true,"summary":"...","followUpDate":"...","need":"..."}`;
  return parseJson<ReplyClassification>(await claude(system, `Entreprise : ${company}\n\nRéponse :\n${replyText}`, 500));
}

/** Textes de la maquette (site ou assistant WhatsApp) dessinée par SŌ et insérée en bas du premier e-mail. */
export async function draftMockup(knowledge: string, p: ProspectContext, layout: MockupContent["layout"]): Promise<MockupContent> {
  const common = `Tu écris les textes d'une MAQUETTE visuelle que ZEMA TECHNOLOGIES montre à un prospect, pour lui faire imaginer le résultat.
BASE DE CONNAISSANCE : ${knowledge}
Règles : français, textes très courts et vendeurs, centrés sur les nouveaux clients et la hausse du chiffre d'affaires du prospect.
Utiliser le vrai nom de l'entreprise, son secteur et sa commune. N'inventer ni prix, ni chiffres d'activité, ni récompenses. Pas d'émojis.`;
  const spec = layout === "whatsapp"
    ? `Maquette : assistant WhatsApp de l'entreprise (téléphone avec une conversation).
Réponds UNIQUEMENT en JSON : {"layout":"whatsapp","brandName":"nom court de l'entreprise","heroTitle":"promesse en 8 à 12 mots","heroSubtitle":"1 phrase","benefits":["3 bénéfices de 3 à 7 mots"],"conversation":[{"from":"client","text":"..."},{"from":"bot","text":"..."}]}
La conversation (6 bulles, alternées, chacune 25 mots maximum) montre un client typique du secteur qui demande un service, l'assistant qui répond, qualifie le besoin et propose un rappel ou un rendez-vous.`
    : `Maquette : page d'accueil du futur site web de l'entreprise.
Réponds UNIQUEMENT en JSON : {"layout":"site","brandName":"nom court","navItems":["4 entrées de menu courtes"],"heroTitle":"titre accrocheur, 8 mots max","heroSubtitle":"1 phrase de 20 mots max","primaryCta":"2 à 3 mots","searchFields":["3 champs de recherche, UNIQUEMENT pour l'immobilier, sinon tableau vide"],"sectionTitle":"titre de section","cards":[{"title":"...","meta":"détails courts","badge":"1 à 2 mots","action":"2 à 3 mots"}],"highlights":[{"title":"2 à 3 mots","text":"1 phrase courte"}],"finalCta":"phrase d'appel, 9 mots max"}
Exactement 3 cards (immobilier : 3 biens types plausibles dans la commune ; BTP : 3 réalisations types ; services : 3 prestations) et 3 highlights.`;
  const user = JSON.stringify({ entreprise: p.company, secteur: p.sector, commune: p.district, opportunite: p.opportunity, constats: p.site.issues });
  const c = parseJson<MockupContent>(await claude(`${common}\n${spec}`, user, 1200));
  return { ...c, layout } as MockupContent;
}
