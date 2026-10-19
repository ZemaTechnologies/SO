import Link from "next/link";
import { db, type Prospect } from "@/lib/supabase";
import { STAGES, SECTORS, REPLIES, scoreClass } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function Prospects({ searchParams }: { searchParams: Promise<{ etape?: string; secteur?: string; min?: string }> }) {
  const sp = await searchParams;
  let q = db().from("prospects").select("*").order("is_hot", { ascending: false }).order("score", { ascending: false, nullsFirst: false }).limit(300);
  if (sp.etape) q = q.eq("stage", sp.etape);
  if (sp.secteur) q = q.eq("sector", sp.secteur);
  if (sp.min) q = q.gte("score", Number(sp.min));
  const { data } = await q;
  const rows = (data ?? []) as Prospect[];

  return (
    <>
      <h1>Prospects</h1>
      <form className="row" style={{ margin: "14px 0" }}>
        <select name="etape" defaultValue={sp.etape ?? ""} style={{ width: 180 }}>
          <option value="">Toutes les étapes</option>
          {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="secteur" defaultValue={sp.secteur ?? ""} style={{ width: 220 }}>
          <option value="">Tous les secteurs</option>
          {Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="min" defaultValue={sp.min ?? ""} style={{ width: 160 }}>
          <option value="">Tous les scores</option>
          <option value="70">70 et plus</option>
          <option value="50">50 et plus</option>
        </select>
        <button className="secondary">Filtrer</button>
      </form>
      <table>
        <thead><tr><th>Entreprise</th><th>Secteur</th><th>Score</th><th>Opportunité</th><th>Étape</th><th>Réponse</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/prospects/${p.id}`}>{p.company}</Link>{p.is_hot && <span className="hot"> 🔥</span>}<div className="muted">{p.district ?? ""}</div></td>
              <td>{SECTORS[p.sector ?? ""] ?? p.sector ?? "—"}</td>
              <td className={`score ${scoreClass(p.score)}`}>{p.score ?? "—"}</td>
              <td>{p.main_opportunity ?? "—"}</td>
              <td><span className="badge">{STAGES[p.stage] ?? p.stage}</span></td>
              <td>{p.last_reply_class ? REPLIES[p.last_reply_class] : "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">Aucun prospect. Lancez une recherche.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
