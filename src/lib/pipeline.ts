import "server-only";
import { randomBytes } from "node:crypto";
import { db, type Prospect } from "./supabase";
import { knowledge } from "./knowledge";
import { searchPlaces, buildQuery, guessDistrict, SECTOR_QUERIES } from "./places";
import { analyzeSite, type SiteAnalysis } from "./analyze-site";
import { detectOpportunity, scoreProspect } from "./score";
import { draftEmail, draftPreview, classifyReply } from "./ai";
import { sendMail } from "./mailer";
import { fetchUnread } from "./inbox";

const DAY = 24 * 3600 * 1000;
const FOLLOW_UP_DELAYS = [3, 4]; // J+3 après le premier e-mail, puis J+7

async function log(prospectId: string, kind: string, content: string, extra: Record<string, unknown> = {}) {
  await db().from("interactions").insert({ prospect_id: prospectId, kind, content, ...extra });
}

async function isSuppressed(email: string | null): Promise<boolean> {
  if (!email) return false;
  const domain = email.split("@")[1];
  const { data } = await db().from("suppression_list").select("id").or(`email.eq.${email},domain.eq.${domain}`).limit(1);
  return !!data?.length;
}

/* ───────────── 1. Recherche ───────────── */

/** Cherche des entreprises d'un secteur dans une commune, crée les fiches nouvelles et les analyse. */
export async function runSearch(sector: string, district: string, max = 10) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY manquante dans .env.local");
  const queries = SECTOR_QUERIES[sector] ?? [sector];
  const created: string[] = [];
  let skipped = 0;

  for (const base of queries) {
    if (created.length >= max) break;
    const { results } = await searchPlaces(buildQuery(base, district), key);
    for (const r of results) {
      if (created.length >= max) break;
      const { data: existing } = await db().from("prospects").select("id").eq("google_place_id", r.placeId).maybeSingle();
      if (existing) { skipped++; continue; }
      const { data: inserted, error } = await db().from("prospects").insert({
        company: r.name,
        sector,
        district: guessDistrict(r.address) ?? district,
        address: r.address,
        website: r.website,
        phone: r.phone,
        source: "google_places",
        google_place_id: r.placeId,
        score_details: { avis_google: r.ratingCount ?? 0 },
      }).select("id").single();
      if (error || !inserted) continue;
      created.push(inserted.id);
      await log(inserted.id, "changement_etape", `Trouvé via Google Maps (« ${base} ${district} »)`);
    }
  }

  for (const id of created) {
    await analyzeProspect(id).catch(async (e) => log(id, "note", `Analyse échouée : ${String(e)}`));
  }
  return { created: created.length, skipped };
}

/* ───────────── 2. Analyse, opportunité, score ───────────── */

export async function analyzeProspect(id: string) {
  const { data: p } = await db().from("prospects").select("*").eq("id", id).single<Prospect>();
  if (!p) throw new Error("Prospect introuvable");

  const site: SiteAnalysis = await analyzeSite(p.website ?? undefined, process.env.GOOGLE_MAPS_API_KEY);
  const email = p.email ?? site.emails[0] ?? null;
  const signals = {
    sector: p.sector ?? undefined,
    hasEmail: !!email,
    hasPhone: !!(p.phone || site.phones.length),
    hasDecisionMaker: !!p.decision_maker,
    ratingCount: Number(p.score_details?.avis_google ?? 0),
  };
  const opportunity = detectOpportunity(site, signals);
  const { score, details } = scoreProspect(site, signals);

  await db().from("analyses").insert({
    prospect_id: id,
    site_exists: site.siteExists,
    site_up: site.siteUp,
    https: site.https,
    mobile_friendly: site.mobileFriendly,
    performance_score: site.performanceScore,
    has_whatsapp_link: site.hasWhatsappLink,
    has_contact_form: site.hasContactForm,
    has_clear_cta: site.hasClearCta,
    seo_basics: site.seo,
    social_presence: site.socials,
    summary: site.issues.join(" · "),
    raw: site,
  });

  await db().from("prospects").update({
    email,
    phone: p.phone ?? site.phones[0] ?? null,
    facebook_url: p.facebook_url ?? site.socials.facebook ?? null,
    instagram_url: p.instagram_url ?? site.socials.instagram ?? null,
    linkedin_url: p.linkedin_url ?? site.socials.linkedin ?? null,
    score,
    score_details: { ...details, avis_google: signals.ratingCount },
    main_opportunity: opportunity.offer,
    opportunity_reason: opportunity.reason,
    stage: score >= 70 ? "qualifie" : "analyse",
  }).eq("id", id);

  await log(id, "changement_etape", `Analysé : score ${score}/100 — ${opportunity.offer}`);
  return { score, opportunity, site };
}

async function latestAnalysis(id: string): Promise<SiteAnalysis | null> {
  const { data } = await db().from("analyses").select("raw").eq("prospect_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data?.raw as SiteAnalysis) ?? null;
}

/* ───────────── 3. Aperçu + premier e-mail (brouillon à valider) ───────────── */

export async function prepareOutreach(id: string) {
  const { data: p } = await db().from("prospects").select("*").eq("id", id).single<Prospect>();
  if (!p) throw new Error("Prospect introuvable");
  if (p.do_not_contact || (await isSuppressed(p.email))) throw new Error("Ce prospect est sur la liste « ne plus contacter »");
  if (!p.email) throw new Error("Pas d'adresse e-mail : complétez la fiche avant de préparer le message");

  const site = (await latestAnalysis(id)) ?? (await analyzeProspect(id)).site;
  const kb = await knowledge();
  const opportunity = { offer: p.main_opportunity ?? "Diagnostic digital", reason: p.opportunity_reason ?? "" };
  const base = {
    company: p.company, sector: p.sector ?? undefined, district: p.district ?? undefined,
    decisionMaker: p.decision_maker ?? undefined, decisionMakerRole: p.decision_maker_role ?? undefined,
    website: p.website ?? undefined, site, opportunity,
  };

  const preview = await draftPreview(kb, base);
  const slug = randomBytes(9).toString("base64url");
  await db().from("previews").insert({ prospect_id: id, slug, content: preview });
  const previewUrl = `${process.env.APP_URL || "http://localhost:3000"}/p/${slug}`;

  const mail = await draftEmail(kb, { ...base, previewUrl }, 0);
  await db().from("messages").delete().eq("prospect_id", id).eq("status", "brouillon");
  await db().from("messages").insert({ prospect_id: id, step: 0, subject: mail.subject, body: mail.body, status: "brouillon" });
  await log(id, "note", "Aperçu et premier e-mail préparés, en attente de validation");
  return { previewUrl };
}

/** Validation par Michael : le message part au prochain envoi. */
export async function approveMessage(messageId: string, subject?: string, body?: string) {
  const patch: Record<string, unknown> = { status: "valide", approved_at: new Date().toISOString(), scheduled_at: new Date().toISOString() };
  if (subject !== undefined) patch.subject = subject;
  if (body !== undefined) patch.body = body;
  await db().from("messages").update(patch).eq("id", messageId);
}

/* ───────────── 4. Envoi et relances ───────────── */

/** Envoie les messages dus, dans la limite quotidienne de nouveaux contacts, et programme les relances. */
export async function sendDue() {
  const limit = Number(process.env.DAILY_NEW_CONTACTS || 10);
  const since = new Date(Date.now() - DAY).toISOString();
  const { count: sentToday } = await db().from("messages").select("id", { count: "exact", head: true })
    .eq("step", 0).eq("status", "envoye").gte("sent_at", since);
  let budget = Math.max(0, limit - (sentToday ?? 0));

  const { data: due } = await db().from("messages").select("*, prospects(*)")
    .in("status", ["valide", "programme"]).lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at").limit(50);

  let sent = 0, failed = 0, cancelled = 0;
  for (const m of due ?? []) {
    const p = m.prospects as Prospect;
    const stopped = p.do_not_contact || ["reponse", "lead_qualifie", "rdv", "proposition", "negociation", "gagne", "perdu"].includes(p.stage) || (await isSuppressed(p.email));
    if (stopped || !p.email) {
      await db().from("messages").update({ status: "annule" }).eq("id", m.id); cancelled++; continue;
    }
    if (m.step === 0) { if (budget <= 0) continue; budget--; }
    try {
      const providerId = await sendMail(p.email, m.subject ?? `ZEMA TECHNOLOGIES — ${p.company}`, m.body);
      await db().from("messages").update({ status: "envoye", sent_at: new Date().toISOString(), provider_message_id: providerId }).eq("id", m.id);
      const stage = m.step === 0 ? "contacte" : m.step === 1 ? "relance_1" : "relance_2";
      await db().from("prospects").update({ stage }).eq("id", p.id);
      await log(p.id, "changement_etape", `E-mail ${m.step === 0 ? "initial" : `de relance ${m.step}`} envoyé : « ${m.subject} »`);
      sent++;
      if (m.step < 2) await scheduleFollowUp(p, m.step + 1, m.subject ?? "");
    } catch (e) {
      await db().from("messages").update({ status: "echec", error: String(e) }).eq("id", m.id);
      await db().from("notifications").insert({ prospect_id: p.id, kind: "echec", title: `Échec d'envoi — ${p.company}`, body: String(e) });
      failed++;
    }
  }
  return { sent, failed, cancelled, remainingNewContactsToday: budget };
}

async function scheduleFollowUp(p: Prospect, step: 1 | 2, previousSubject: string) {
  const site = (await latestAnalysis(p.id)) ?? undefined;
  const { data: history } = await db().from("messages").select("body").eq("prospect_id", p.id).eq("status", "envoye").order("step");
  const mail = await draftEmail(await knowledge(), {
    company: p.company, sector: p.sector ?? undefined, district: p.district ?? undefined,
    decisionMaker: p.decision_maker ?? undefined, website: p.website ?? undefined,
    site: site ?? (await analyzeSite(p.website ?? undefined)),
    opportunity: { offer: p.main_opportunity ?? "", reason: p.opportunity_reason ?? "" },
  }, step, (history ?? []).map((h) => h.body));
  await db().from("messages").insert({
    prospect_id: p.id, step,
    subject: step === 1 ? `Re: ${previousSubject.replace(/^Re:\s*/i, "")}` : mail.subject,
    body: mail.body, status: "programme",
    scheduled_at: new Date(Date.now() + FOLLOW_UP_DELAYS[step - 1] * DAY).toISOString(),
  });
}

/* ───────────── 5. Réponses : classement, mémoire, alerte lead chaud ───────────── */

export async function processInbox() {
  const mails = await fetchUnread();
  let matched = 0, hot = 0;
  for (const mail of mails) {
    const { data: found } = await db().from("prospects").select("*").eq("email", mail.from).order("updated_at", { ascending: false }).limit(1);
    const p = (found?.[0] ?? null) as Prospect | null;
    if (!p) continue;
    matched++;
    const c = await classifyReply(mail.text, p.company);

    // Toute réponse arrête la séquence automatique
    await db().from("messages").update({ status: "annule" }).eq("prospect_id", p.id).in("status", ["programme", "valide", "brouillon"]);

    const patch: Record<string, unknown> = { last_reply_class: c.classification, stage: "reponse", is_hot: c.isHot };
    if (c.classification === "ne_plus_contacter" || c.classification === "refus") {
      patch.do_not_contact = c.classification === "ne_plus_contacter";
      patch.stage = "perdu";
      if (c.classification === "ne_plus_contacter") await db().from("suppression_list").insert({ email: mail.from, reason: "Demande du prospect" });
    }
    if (c.isHot || c.classification === "interesse") patch.stage = "lead_qualifie";
    if (c.followUpDate) { patch.next_action_at = new Date(c.followUpDate).toISOString(); patch.next_action_note = `Recontacter : ${c.summary}`; }
    await db().from("prospects").update(patch).eq("id", p.id);
    await log(p.id, "reponse_email", mail.text, { classification: c.classification, ai_summary: c.summary });

    if (c.isHot) {
      hot++;
      const title = `Prospect chaud — ${p.company}`;
      const body = `Besoin : ${c.need ?? p.main_opportunity ?? "à préciser"}\nRésumé : ${c.summary}\n\nMessage :\n« ${mail.text.slice(0, 600)} »\n\nTéléphone : ${p.phone ?? "—"}\nE-mail : ${p.email}`;
      await db().from("notifications").insert({ prospect_id: p.id, kind: "lead_chaud", title, body, sent_via: "email" });
      if (process.env.ALERT_EMAIL) await sendMail(process.env.ALERT_EMAIL, `🔥 ${title}`, body).catch(() => undefined);
    }
  }
  return { read: mails.length, matched, hot };
}

/** Rappels arrivés à échéance (« revenez en janvier ») : notification + retour dans le pipeline. */
export async function processReminders() {
  const { data } = await db().from("prospects").select("id, company, next_action_note")
    .lte("next_action_at", new Date().toISOString()).not("next_action_at", "is", null);
  for (const p of data ?? []) {
    await db().from("notifications").insert({ prospect_id: p.id, kind: "rappel", title: `Rappel — ${p.company}`, body: p.next_action_note });
    await db().from("prospects").update({ next_action_at: null, stage: "qualifie" }).eq("id", p.id);
    await log(p.id, "note", `Rappel déclenché : ${p.next_action_note ?? ""}`);
  }
  return { reminders: data?.length ?? 0 };
}
