import Link from "next/link";
import { db } from "@/lib/supabase";
import { MessageEditor } from "@/components/Editors";
import { ActionButton } from "@/components/ActionButton";
import { fmtDate } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function Messages() {
  const [{ data: drafts }, { data: scheduled }] = await Promise.all([
    db().from("messages").select("*, prospects(id, company, email, score, main_opportunity)").eq("status", "brouillon").order("created_at"),
    db().from("messages").select("*, prospects(id, company)").in("status", ["valide", "programme"]).order("scheduled_at").limit(50),
  ]);
  return (
    <>
      <h1>Messages à valider</h1>
      <p className="muted">Relisez, corrigez si besoin, puis validez. Les relances J+3 et J+7 sont programmées automatiquement et s'arrêtent dès que le prospect répond.</p>
      <div className="row" style={{ margin: "12px 0" }}>
        <ActionButton url="/api/run?task=send" label="Envoyer maintenant les messages validés" busyLabel="Envoi…" variant="secondary" />
      </div>
      {(drafts ?? []).length === 0 && <p className="card muted">Aucun message en attente.</p>}
      <div className="grid">
        {(drafts ?? []).map((m: any) => (
          <div className="card" key={m.id}>
            <p><Link href={`/prospects/${m.prospects.id}`}><strong>{m.prospects.company}</strong></Link> — {m.prospects.email} · score {m.prospects.score} · {m.prospects.main_opportunity}</p>
            <MessageEditor id={m.id} subject={m.subject ?? ""} body={m.body} hasImage={!!m.image_path} />
          </div>
        ))}
      </div>
      <h2>Programmés</h2>
      <table>
        <thead><tr><th>Prospect</th><th>Message</th><th>Statut</th><th>Prévu le</th></tr></thead>
        <tbody>
          {(scheduled ?? []).map((m: any) => (
            <tr key={m.id}>
              <td><Link href={`/prospects/${m.prospects.id}`}>{m.prospects.company}</Link></td>
              <td>{m.step === 0 ? "Premier e-mail" : `Relance ${m.step}`} — {m.subject}</td>
              <td><span className="badge">{m.status}</span></td>
              <td>{fmtDate(m.scheduled_at)}</td>
            </tr>
          ))}
          {(scheduled ?? []).length === 0 && <tr><td colSpan={4} className="muted">Rien de programmé.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
