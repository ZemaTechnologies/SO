import Link from "next/link";
import { db } from "@/lib/supabase";
import { ActionButton } from "@/components/ActionButton";
import { fmtDate } from "@/lib/labels";

export const dynamic = "force-dynamic";

async function count(filter: (q: any) => any) {
  const { count } = await filter(db().from("prospects").select("id", { count: "exact", head: true }));
  return count ?? 0;
}

export default async function Dashboard() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [total, analysed, contacted, replies, hot, rdv, won, toValidate, notifs, sentMonth, revenue] = await Promise.all([
    count((q) => q),
    count((q) => q.neq("stage", "identifie")),
    count((q) => q.in("stage", ["contacte", "relance_1", "relance_2", "reponse", "lead_qualifie", "rdv", "proposition", "negociation", "gagne", "perdu"])),
    count((q) => q.not("last_reply_class", "is", null)),
    count((q) => q.eq("is_hot", true).not("stage", "in", "(gagne,perdu)")),
    count((q) => q.eq("stage", "rdv")),
    count((q) => q.eq("stage", "gagne")),
    db().from("messages").select("id", { count: "exact", head: true }).eq("status", "brouillon").then((r) => r.count ?? 0),
    db().from("notifications").select("*, prospects(company)").is("read_at", null).order("created_at", { ascending: false }).limit(8).then((r) => r.data ?? []),
    db().from("messages").select("id", { count: "exact", head: true }).eq("status", "envoye").gte("sent_at", since).then((r) => r.count ?? 0),
    db().from("prospects").select("deal_value_fcfa").eq("stage", "gagne").then((r) => (r.data ?? []).reduce((a, p) => a + (p.deal_value_fcfa ?? 0), 0)),
  ]);
  const rate = contacted ? Math.round((replies / contacted) * 100) : 0;

  return (
    <>
      <h1>Tableau de bord</h1>
      <p className="muted">Prospection — vue d'ensemble</p>

      <div className="grid kpis">
        <Kpi v={total} l="Entreprises trouvées" />
        <Kpi v={analysed} l="Analysées" />
        <Kpi v={contacted} l="Contactées" />
        <Kpi v={`${replies} (${rate} %)`} l="Réponses (taux)" />
        <Kpi v={hot} l="Leads chauds" hot />
        <Kpi v={rdv} l="Rendez-vous" />
        <Kpi v={won} l="Clients gagnés" />
        <Kpi v={`${revenue.toLocaleString("fr-FR")} F`} l="CA prospection" />
      </div>

      <h2>À faire</h2>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <p><strong>{toValidate}</strong> e-mail(s) à valider · <strong>{sentMonth}</strong> envoyé(s) sur 30 jours</p>
          <div className="row">
            <Link className="btn" href="/messages">Valider les messages</Link>
            <ActionButton url="/api/run?task=all" label="Envoyer et lire les réponses" busyLabel="Traitement…" variant="secondary" />
          </div>
        </div>
        <div className="card">
          <strong>Alertes</strong>
          {notifs.length === 0 && <p className="muted">Aucune alerte.</p>}
          <ul>
            {notifs.map((n: any) => (
              <li key={n.id}>
                <Link href={`/prospects/${n.prospect_id}`} className={n.kind === "lead_chaud" ? "hot" : ""}>{n.title}</Link>{" "}
                <span className="muted">{fmtDate(n.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Kpi({ v, l, hot }: { v: number | string; l: string; hot?: boolean }) {
  return <div className="card kpi"><div className={`v ${hot ? "hot" : ""}`}>{v}</div><div className="l">{l}</div></div>;
}
