import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import type { PreviewContent } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Page publique envoyée au prospect : son aperçu personnalisé, aux couleurs de ZEMA. */
export default async function Preview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await db().from("previews").select("*, prospects(company)").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  await db().from("previews").update({ view_count: (data.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() }).eq("id", data.id);
  const c = data.content as PreviewContent;
  const company = (data.prospects as { company: string }).company;

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <header style={{ background: "#020f1f", color: "#fff", padding: "28px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/logo-zema.png" alt="ZEMA TECHNOLOGIES" width={56} height={56} style={{ background: "#fff", borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 13, color: "#9fb0cc", letterSpacing: 1 }}>APERÇU PRÉPARÉ POUR</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{company}</div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px", lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 28, color: "#020f1f" }}>{c.headline}</h1>
        <Section title="Ce que nous avons observé"><ul>{c.observations.map((o) => <li key={o}>{o}</li>)}</ul></Section>
        <Section title="L'opportunité"><p>{c.opportunity}</p></Section>
        <Section title="Ce que ZEMA mettrait en place"><ol>{c.whatWeWouldDo.map((o) => <li key={o}>{o}</li>)}</ol></Section>
        <Section title="Ce que vous y gagnez"><ul>{c.expectedBenefits.map((o) => <li key={o}>{o}</li>)}</ul></Section>
        <div style={{ background: "#0050eb", color: "#fff", borderRadius: 14, padding: 24, marginTop: 28 }}>
          <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 14px" }}>{c.cta}</p>
          <a href="https://wa.me/2250715183568" style={{ background: "#fff", color: "#0050eb", padding: "10px 18px", borderRadius: 8, fontWeight: 600 }}>Échanger sur WhatsApp</a>
          <span style={{ marginLeft: 14 }}>ou +225 07 15 18 35 68</span>
        </div>
        <p style={{ color: "#5b6577", fontSize: 13, marginTop: 32 }}>
          ZEMA TECHNOLOGIES — Votre partenaire IA & Digital · Angré, Abidjan · <a href="https://www.zematechnologies.com">www.zematechnologies.com</a>
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, color: "#0050eb", marginBottom: 6 }}>{title}</h2>
      {children}
    </section>
  );
}
