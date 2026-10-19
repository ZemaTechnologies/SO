// Maquette visuelle insérée en image à la fin du premier e-mail.
// Dessinée par SŌ (next/og) aux couleurs ZEMA, avec les textes rédigés par Claude.
// Aucun coût supplémentaire : pas de générateur d'images externe.

import { ImageResponse } from "next/og";
import { createElement as h, type ReactNode } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

const NAVY = "#020F1F";
const BLUE = "#0050EB";
const LIGHT = "#F3F6FB";
const GREY = "#5B6577";
const GREEN = "#25D366";

export type SiteMockup = {
  layout: "site";
  brandName: string;
  navItems: string[];          // 4 entrées de menu
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  searchFields?: string[];     // immobilier : Type de bien, Commune, Budget
  sectionTitle: string;
  cards: { title: string; meta: string; badge?: string; action: string }[]; // 3 cartes
  highlights: { title: string; text: string }[];                            // 3 atouts
  finalCta: string;
};

export type WhatsappMockup = {
  layout: "whatsapp";
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  benefits: string[];          // 3 bénéfices
  conversation: { from: "client" | "bot"; text: string }[]; // 6 à 8 bulles
};

export type MockupContent = SiteMockup | WhatsappMockup;

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700; style: "normal" };
let fonts: Font[] | null = null;
async function loadFonts(): Promise<Font[]> {
  if (fonts) return fonts;
  const dir = path.join(process.cwd(), "brand", "fonts");
  const load = async (file: string, weight: 400 | 500 | 700): Promise<Font> => {
    const b = await readFile(path.join(dir, file));
    return { name: "Poppins", data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, weight, style: "normal" };
  };
  fonts = await Promise.all([load("Poppins-Regular.ttf", 400), load("Poppins-Medium.ttf", 500), load("Poppins-Bold.ttf", 700)]);
  return fonts;
}

/* ── petits utilitaires : chaque div à plusieurs enfants doit être en flex (contrainte de next/og) ── */
type S = Record<string, string | number>;
const box = (style: S, ...children: ReactNode[]) => h("div", { style: { display: "flex", ...style } }, ...children);
const text = (style: S, value: string) => h("div", { style: { display: "flex", ...style } }, value);
// Retire émojis et symboles absents de la police (sinon next/og va les chercher sur Internet).
const clean = (s: string) => s.replace(/[^\u0000-\u024F\u2000-\u206F\u20AC\u2122]/g, "").replace(/\s{2,}/g, " ");
const cut = (s: string | undefined, n: number) => { const v = clean(s ?? "").trim(); return v.length > n ? v.slice(0, n - 1).trimEnd() + "…" : v; };
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "votre-site";

function browserFrame(domain: string, ...children: ReactNode[]) {
  return box({ flexDirection: "column", width: "100%", height: "100%", background: "#FFFFFF", fontFamily: "Poppins" },
    box({ alignItems: "center", gap: 10, padding: "18px 26px", background: "#E8ECF3" },
      box({ width: 16, height: 16, borderRadius: 8, background: "#FF5F57" }),
      box({ width: 16, height: 16, borderRadius: 8, background: "#FEBC2E" }),
      box({ width: 16, height: 16, borderRadius: 8, background: "#28C840" }),
      box({ marginLeft: 24, flex: 1, padding: "8px 20px", borderRadius: 20, background: "#FFFFFF", color: GREY, fontSize: 20 }, `www.${domain}.ci`),
    ),
    ...children,
  );
}

/** Visuel d'illustration (pas de photo) : dégradé ZEMA avec une silhouette de bâtiment. */
function visual(height: number, variant: number) {
  const hues = [["#0050EB", "#020F1F"], ["#2E7BFF", "#0A2A5E"], ["#0A3D91", "#00A3FF"]][variant % 3];
  return box({ height, borderRadius: 18, background: `linear-gradient(135deg, ${hues[0]}, ${hues[1]})`, alignItems: "flex-end", justifyContent: "center", gap: 14, padding: "0 40px" },
    box({ width: 70, height: height * 0.45, background: "rgba(255,255,255,0.22)", borderRadius: "8px 8px 0 0" }),
    box({ width: 90, height: height * 0.7, background: "rgba(255,255,255,0.32)", borderRadius: "8px 8px 0 0" }),
    box({ width: 60, height: height * 0.55, background: "rgba(255,255,255,0.18)", borderRadius: "8px 8px 0 0" }),
  );
}

function siteLayout(c: SiteMockup) {
  const cards = c.cards.slice(0, 3);
  const fields = (c.searchFields ?? []).slice(0, 3);
  return browserFrame(slug(c.brandName),
    // Barre de navigation
    box({ alignItems: "center", justifyContent: "space-between", padding: "26px 60px", borderBottom: "1px solid #E6EAF1" },
      text({ fontSize: 30, fontWeight: 700, color: NAVY }, cut(c.brandName, 28)),
      box({ alignItems: "center", gap: 34 },
        ...c.navItems.slice(0, 4).map((n) => text({ fontSize: 20, color: GREY }, cut(n, 14))),
        box({ padding: "12px 24px", borderRadius: 30, background: GREEN, color: "#FFFFFF", fontSize: 19, fontWeight: 500 }, "WhatsApp"),
      ),
    ),
    // Bandeau principal
    box({ flexDirection: "column", padding: "64px 60px 56px", background: `linear-gradient(120deg, ${NAVY} 0%, #06306F 55%, ${BLUE} 100%)`, color: "#FFFFFF" },
      text({ fontSize: 54, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }, cut(c.heroTitle, 70)),
      text({ fontSize: 24, marginTop: 18, color: "#C9D6EE", maxWidth: 860, lineHeight: 1.45 }, cut(c.heroSubtitle, 150)),
      fields.length
        ? box({ marginTop: 36, background: "#FFFFFF", borderRadius: 18, padding: 14, gap: 12, alignItems: "center" },
            ...fields.map((f) => box({ flex: 1, padding: "16px 20px", borderRadius: 12, background: LIGHT, color: GREY, fontSize: 19 }, cut(f, 22))),
            box({ padding: "16px 30px", borderRadius: 12, background: BLUE, color: "#FFFFFF", fontSize: 20, fontWeight: 500 }, cut(c.primaryCta, 22)),
          )
        : box({ marginTop: 34, gap: 16 },
            box({ padding: "16px 32px", borderRadius: 32, background: "#FFFFFF", color: BLUE, fontSize: 21, fontWeight: 700 }, cut(c.primaryCta, 30)),
            box({ padding: "16px 32px", borderRadius: 32, border: "2px solid #FFFFFF", color: "#FFFFFF", fontSize: 21, fontWeight: 500 }, "Nous contacter"),
          ),
    ),
    // Cartes
    box({ flexDirection: "column", padding: "48px 60px 30px", background: "#FFFFFF" },
      text({ fontSize: 34, fontWeight: 700, color: NAVY }, cut(c.sectionTitle, 50)),
      box({ marginTop: 26, gap: 26 },
        ...cards.map((k, i) => box({ flex: 1, flexDirection: "column", borderRadius: 22, border: "1px solid #E3E8F0", padding: 16, background: "#FFFFFF", boxShadow: "0 10px 30px rgba(2,15,31,0.08)" },
          visual(190, i),
          k.badge ? box({ marginTop: 16, alignSelf: "flex-start", padding: "6px 14px", borderRadius: 14, background: "#E6EEFF", color: BLUE, fontSize: 16, fontWeight: 500 }, cut(k.badge, 18)) : box({ marginTop: 6 }),
          text({ marginTop: 12, fontSize: 23, fontWeight: 700, color: NAVY, lineHeight: 1.25 }, cut(k.title, 40)),
          text({ marginTop: 6, fontSize: 18, color: GREY, lineHeight: 1.4 }, cut(k.meta, 60)),
          box({ marginTop: 16, padding: "12px 0", borderRadius: 12, background: BLUE, color: "#FFFFFF", fontSize: 18, fontWeight: 500, justifyContent: "center" }, cut(k.action, 26)),
        )),
      ),
    ),
    // Atouts
    box({ gap: 26, padding: "26px 60px 44px" },
      ...c.highlights.slice(0, 3).map((x) => box({ flex: 1, flexDirection: "column", padding: 26, borderRadius: 20, background: LIGHT },
        box({ width: 44, height: 6, borderRadius: 3, background: BLUE }),
        text({ marginTop: 14, fontSize: 22, fontWeight: 700, color: NAVY }, cut(x.title, 32)),
        text({ marginTop: 6, fontSize: 18, color: GREY, lineHeight: 1.4 }, cut(x.text, 80)),
      )),
    ),
    // Appel final
    box({ marginTop: "auto", alignItems: "center", justifyContent: "space-between", padding: "34px 60px", background: NAVY, color: "#FFFFFF" },
      text({ fontSize: 28, fontWeight: 700, maxWidth: 760 }, cut(c.finalCta, 60)),
      box({ padding: "16px 30px", borderRadius: 32, background: GREEN, fontSize: 21, fontWeight: 700 }, "Écrire sur WhatsApp"),
    ),
  );
}

function whatsappLayout(c: WhatsappMockup) {
  const bubbles = c.conversation.slice(0, 8);
  return box({ width: "100%", height: "100%", fontFamily: "Poppins", background: `linear-gradient(135deg, ${NAVY} 0%, #06306F 60%, ${BLUE} 100%)`, padding: "70px 70px", gap: 60, alignItems: "center" },
    // Texte à gauche
    box({ flex: 1, flexDirection: "column", color: "#FFFFFF" },
      box({ alignSelf: "flex-start", padding: "8px 18px", borderRadius: 20, background: "rgba(255,255,255,0.14)", fontSize: 18 }, `Assistant WhatsApp — ${cut(c.brandName, 30)}`),
      text({ marginTop: 26, fontSize: 50, fontWeight: 700, lineHeight: 1.15 }, cut(c.heroTitle, 70)),
      text({ marginTop: 18, fontSize: 22, color: "#C9D6EE", lineHeight: 1.45 }, cut(c.heroSubtitle, 150)),
      box({ flexDirection: "column", marginTop: 34, gap: 18 },
        ...c.benefits.slice(0, 3).map((b) => box({ alignItems: "center", gap: 16 },
          box({ width: 34, height: 34, borderRadius: 17, background: GREEN, color: "#FFFFFF", fontSize: 20, fontWeight: 700, justifyContent: "center", alignItems: "center" }, box({ width: 12, height: 12, borderRadius: 6, background: "#FFFFFF" })),
          text({ fontSize: 22, flex: 1 }, cut(b, 70)),
        )),
      ),
    ),
    // Téléphone à droite
    box({ width: 470, height: 860, borderRadius: 54, background: "#0B0B0B", padding: 14, flexDirection: "column" },
      box({ flexDirection: "column", flex: 1, borderRadius: 42, overflow: "hidden", background: "#ECE5DD" },
        box({ alignItems: "center", gap: 14, padding: "26px 22px 18px", background: "#075E54", color: "#FFFFFF" },
          box({ width: 46, height: 46, borderRadius: 23, background: "#FFFFFF", color: "#075E54", fontSize: 22, fontWeight: 700, justifyContent: "center", alignItems: "center" }, (clean(c.brandName).trim()[0] ?? "Z").toUpperCase()),
          box({ flexDirection: "column" },
            text({ fontSize: 20, fontWeight: 700 }, cut(c.brandName, 22)),
            text({ fontSize: 15, color: "#CFE9E4" }, "en ligne · répond instantanément"),
          ),
        ),
        box({ flexDirection: "column", padding: "18px 16px", gap: 12 },
          ...bubbles.map((m) => box({
            alignSelf: m.from === "client" ? "flex-end" : "flex-start", maxWidth: 340, padding: "12px 16px", borderRadius: 16,
            background: m.from === "client" ? "#DCF8C6" : "#FFFFFF", color: "#111B21", fontSize: 17, lineHeight: 1.4,
          }, cut(m.text, 120))),
        ),
        box({ marginTop: "auto", alignItems: "center", gap: 10, padding: "14px 14px 18px" },
          box({ flex: 1, padding: "12px 18px", borderRadius: 24, background: "#FFFFFF", color: "#8696A0", fontSize: 16 }, "Écrire un message"),
          box({ width: 46, height: 46, borderRadius: 23, background: "#075E54" }),
        ),
      ),
    ),
  );
}

/** Rend la maquette en PNG (1200 px de large, lisible dans un e-mail). */
export async function renderMockup(c: MockupContent): Promise<Buffer> {
  const element = c.layout === "whatsapp" ? whatsappLayout(c) : siteLayout(c);
  const res = new ImageResponse(element, { width: 1200, height: c.layout === "whatsapp" ? 1000 : 1560, fonts: await loadFonts() });
  return Buffer.from(await res.arrayBuffer());
}

/** Choix du modèle de maquette selon l'offre proposée. */
export function mockupLayoutFor(offer: string | null | undefined): MockupContent["layout"] {
  return /whatsapp/i.test(offer ?? "") ? "whatsapp" : "site";
}
