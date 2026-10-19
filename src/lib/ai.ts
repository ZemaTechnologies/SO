// Appels à l'API Claude : rédaction des e-mails, aperçu personnalisé, classement des réponses.

import type { SiteAnalysis } from "./analyze-site";
import type { Opportunity } from "./score";

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
};

export type EmailDraft = { subject: string; body: string };

/** Premier e-mail (step 0) ou relances (step 1, 2) qui apportent chacune quelque chose de nouveau. */
export async function draftEmail(knowledge: string, p: ProspectContext, step: 0 | 1 | 2, history: string[] = []): Promise<EmailDraft> {
  const system = `Tu es l'assistant commercial de ZEMA TECHNOLOGIES (Abidjan). Tu rédiges des e-mails de prospection B2B en français, au nom de Michael ZEBA, fondateur.

BASE DE CONNAISSANCE ZEMA :
${knowledge}

RÈGLES :
- Vouvoiement. 90 à 140 mots maximum. Ton professionnel, chaleureux, jamais insistant.
- Commencer par une observation réelle et précise sur l'entreprise (tirée de l'analyse fournie), jamais par « Nous sommes ZEMA ».
- Proposer UNE seule offre : celle indiquée dans "opportunité". Ne jamais lister le catalogue.
- N'inventer aucun chiffre, aucun client, aucun prix. Ne citer un client que s'il est marqué « Oui » dans la base.
- Un seul appel à l'action : un échange de 15 minutes, ou consulter l'aperçu personnalisé si un lien est fourni.
- Signature : Michael ZEBA, Fondateur — ZEMA TECHNOLOGIES — +225 07 15 18 35 68 — www.zematechnologies.com
- Dernière ligne : « Si vous ne souhaitez plus recevoir nos messages, répondez simplement STOP. »
- Relance 1 (step 1) : apporter une idée concrète nouvelle liée à l'opportunité, sans reprocher l'absence de réponse.
- Relance 2 (step 2) : message court de clôture, laisser la porte ouverte.
Réponds UNIQUEMENT en JSON : {"subject": "...", "body": "..."}`;

  const user = JSON.stringify({
    step,
    entreprise: p.company,
    secteur: p.sector,
    commune: p.district,
    decideur: p.decisionMaker ? `${p.decisionMaker} (${p.decisionMakerRole ?? "fonction inconnue"})` : null,
    site: p.website ?? null,
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
3 à 5 observations précises tirées de l'analyse, 3 à 4 actions concrètes que ZEMA ferait, 2 à 3 bénéfices attendus formulés sans chiffres inventés.
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
