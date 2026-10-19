// Analyse digitale automatique du site d'un prospect.
// Ne lit que la page d'accueil publique, comme le ferait un visiteur.

export type SiteAnalysis = {
  siteExists: boolean;
  siteUp: boolean;
  finalUrl?: string;
  https: boolean;
  statusCode?: number;
  loadMs?: number;
  mobileFriendly: boolean;        // présence d'une balise viewport
  performanceScore?: number;      // PageSpeed mobile 0-100
  hasWhatsappLink: boolean;
  hasContactForm: boolean;
  hasClearCta: boolean;
  seo: { title?: string; description?: string; h1?: string };
  socials: { facebook?: string; instagram?: string; linkedin?: string; tiktok?: string; youtube?: string };
  emails: string[];
  phones: string[];
  copyrightYear?: number;         // indice d'un site ancien
  issues: string[];               // constats lisibles, en français
  blocked?: boolean;              // le site refuse les visites automatiques : analyse à faire à la main
};

const CTA_WORDS = ["devis", "contact", "contactez", "rendez-vous", "rdv", "appelez", "réserver", "reserver", "commander", "demander", "whatsapp", "écrivez", "ecrivez"];

function pick(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m?.[1]?.replace(/\s+/g, " ").trim() || undefined;
}

function findSocial(html: string, domain: string): string | undefined {
  const re = new RegExp(`https?://(?:www\\.|m\\.|web\\.)?${domain}/[^"'\\s<>]+`, "i");
  const m = html.match(re);
  if (!m) return undefined;
  const url = m[0];
  if (/sharer|share\?|intent\/|plugins\//i.test(url)) return undefined;
  return url;
}

export async function analyzeSite(url: string | undefined, pageSpeedKey?: string): Promise<SiteAnalysis> {
  const empty: SiteAnalysis = {
    siteExists: false, siteUp: false, https: false, mobileFriendly: false,
    hasWhatsappLink: false, hasContactForm: false, hasClearCta: false,
    seo: {}, socials: {}, emails: [], phones: [], issues: [],
  };
  if (!url) return { ...empty, issues: ["Aucun site web trouvé"] };

  const target = url.startsWith("http") ? url : `https://${url}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SO-ZEMA/1.0; +https://www.zematechnologies.com)" },
    });
  } catch {
    return { ...empty, siteExists: true, issues: ["Le site ne répond pas ou est inaccessible"] };
  }
  const loadMs = Date.now() - started;
  if ([401, 403, 429, 503].includes(res.status)) {
    // Protection anti-robots : on ne conclut rien sur la qualité du site.
    return { ...empty, siteExists: true, siteUp: true, blocked: true, statusCode: res.status, finalUrl: res.url || target,
      https: (res.url || target).startsWith("https://"), issues: ["Analyse automatique bloquée par le site : vérification manuelle à faire"] };
  }
  if (!res.ok) {
    return { ...empty, siteExists: true, siteUp: false, statusCode: res.status, finalUrl: res.url || target,
      https: (res.url || target).startsWith("https://"), issues: [`Le site renvoie une erreur (${res.status})`] };
  }
  const html = (await res.text()).slice(0, 800_000);
  const lower = html.toLowerCase();
  const finalUrl = res.url || target;

  const a: SiteAnalysis = {
    ...empty,
    siteExists: true,
    siteUp: res.ok,
    finalUrl,
    statusCode: res.status,
    loadMs,
    https: finalUrl.startsWith("https://"),
    mobileFriendly: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasWhatsappLink: /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(html),
    hasContactForm: /<form[\s\S]*?(email|mail|message|téléphone|telephone|phone)[\s\S]*?<\/form>/i.test(html),
    hasClearCta: CTA_WORDS.some((w) => lower.includes(w)),
    seo: {
      title: pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description: pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
      h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, ""),
    },
    socials: {
      facebook: findSocial(html, "facebook\\.com"),
      instagram: findSocial(html, "instagram\\.com"),
      linkedin: findSocial(html, "linkedin\\.com"),
      tiktok: findSocial(html, "tiktok\\.com"),
      youtube: findSocial(html, "youtube\\.com"),
    },
    emails: [...new Set((html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [])
      .map((e) => e.toLowerCase())
      .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e) && !e.includes("example") && !e.includes("sentry")))].slice(0, 5),
    phones: [...new Set(html.match(/(?:\+225|00225)?[\s.-]?(?:0[1-9])(?:[\s.-]?\d{2}){4}/g) ?? [])].slice(0, 5),
  };

  const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  if (years.length) a.copyrightYear = Math.max(...years);

  if (pageSpeedKey && a.siteUp) {
    a.performanceScore = await pageSpeed(finalUrl, pageSpeedKey).catch(() => undefined);
  }

  // Constats lisibles
  if (!a.https) a.issues.push("Le site n'est pas sécurisé (pas de HTTPS)");
  if (!a.mobileFriendly) a.issues.push("Le site ne semble pas adapté au mobile");
  if (a.performanceScore !== undefined && a.performanceScore < 50) a.issues.push(`Site lent sur mobile (score ${a.performanceScore}/100)`);
  if (loadMs > 6000) a.issues.push("Temps de chargement élevé");
  if (!a.hasWhatsappLink) a.issues.push("Pas de bouton WhatsApp sur le site");
  if (!a.hasContactForm) a.issues.push("Pas de formulaire de contact détecté");
  if (!a.hasClearCta) a.issues.push("Pas d'appel à l'action clair (devis, contact, rendez-vous)");
  if (!a.seo.title || !a.seo.description) a.issues.push("Référencement de base incomplet (titre ou description manquants)");
  if (a.copyrightYear && a.copyrightYear < new Date().getFullYear() - 2) a.issues.push(`Site probablement ancien (mention © ${a.copyrightYear})`);
  if (!a.socials.facebook && !a.socials.instagram && !a.socials.linkedin) a.issues.push("Aucun réseau social relié au site");

  return a;
}

async function pageSpeed(url: string, key: string): Promise<number | undefined> {
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", "mobile");
  api.searchParams.set("category", "performance");
  api.searchParams.set("key", key);
  const res = await fetch(api, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number } } } };
  const s = data.lighthouseResult?.categories?.performance?.score;
  return typeof s === "number" ? Math.round(s * 100) : undefined;
}
