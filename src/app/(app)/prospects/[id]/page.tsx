import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Prospect, type Message } from "@/lib/supabase";
import { ActionButton } from "@/components/ActionButton";
import { MessageEditor, ProspectEditor, NoteForm } from "@/components/Editors";
import { STAGES, SECTORS, REPLIES, scoreClass, fmtDate } from "@/lib/labels";

export const dynamic = "force-dynamic";

const CRITERIA: Record<string, string> = { besoin: "Besoin détecté /35", adequation: "Adéquation ZEMA /20", contact: "Qualité du contact /20", activite: "Activité /15", urgence: "Urgence /10" };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: p } = await db().from("prospects").select("*").eq("id", id).maybeSingle<Prospect>();
  if (!p) notFound();
  const [{ data: analysis }, { data: messages }, { data: history }, { data: preview }] = await Promise.all([
    db().from("analyses").select("*").eq("prospect_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db().from("messages").select("*").eq("prospect_id", id).order("step").order("created_at"),
    db().from("interactions").select("*").eq("prospect_id", id).order("created_at", { ascending: false }).limit(50),
    db().from("previews").select("*").eq("prospect_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  await db().from("notifications").update({ read_at: new Date().toISOString() }).eq("prospect_id", id).is("read_at", null);
  const issues: string[] = analysis?.raw?.issues ?? [];
  const msgs = (messages ?? []) as Message[];
  const draft = msgs.find((m) => m.status === "brouillon");

  return (
    <>
      <p><Link href="/prospects">← Prospects</Link></p>
      <h1>{p.company} {p.is_hot && <span className="hot">🔥 Lead chaud</span>}</h1>
      <p className="muted">
        {SECTORS[p.sector ?? ""] ?? p.sector} · {p.district ?? p.city} · <span className="badge">{STAGES[p.stage]}</span>
        {p.last_reply_class && <> · {REPLIES[p.last_reply_class]}</>}
        {p.do_not_contact && <span className="error"> · Ne plus contacter</span>}
      </p>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <div className="card">
          <div className={`score ${scoreClass(p.score)}`} style={{ fontSize: 32 }}>{p.score ?? "—"}/100</div>
          <ul className="muted">
            {Object.entries(p.score_details ?? {}).filter(([k]) => CRITERIA[k]).map(([k, v]) => <li key={k}>{CRITERIA[k]} : {v}</li>)}
          </ul>
          <ActionButton url={`/api/prospects/${id}`} body={{ action: "analyze" }} label="Relancer l'analyse" busyLabel="Analyse…" variant="secondary" />
        </div>
        <div className="card">
          <strong>Opportunité ZEMA</strong>
          <p style={{ fontSize: 18, margin: "6px 0" }}>{p.main_opportunity ?? "—"}</p>
          <p className="muted">{p.opportunity_reason}</p>
          {p.website && <p><a href={p.website} target="_blank">{p.website}</a></p>}
        </div>
      </div>

      <h2>Analyse digitale</h2>
      <div className="card">
        {issues.length ? <ul className="issues">{issues.map((i) => <li key={i}>{i}</li>)}</ul> : <p className="muted">Pas encore d'analyse.</p>}
        {analysis?.performance_score != null && <p className="muted">Vitesse mobile (PageSpeed) : {analysis.performance_score}/100</p>}
      </div>

      <h2>Contact</h2>
      {draft ? (
        <div className="card">
          <p><strong>Premier e-mail à valider</strong> — destinataire : {p.email}</p>
          {preview && <p>Aperçu personnalisé : <a href={`/p/${preview.slug}`} target="_blank">ouvrir</a></p>}
          <MessageEditor id={draft.id} subject={draft.subject ?? ""} body={draft.body} />
        </div>
      ) : (
        <div className="card row">
          <ActionButton url={`/api/prospects/${id}`} body={{ action: "prepare" }} label="Préparer l'aperçu et l'e-mail" busyLabel="Rédaction par l'IA…" />
          {!p.email && <span className="error">Ajoutez d'abord un e-mail dans la fiche.</span>}
          {preview && <span className="muted">Aperçu vu {preview.view_count} fois{preview.last_viewed_at ? ` (dernière fois ${fmtDate(preview.last_viewed_at)})` : ""}</span>}
        </div>
      )}

      {msgs.filter((m) => m.status !== "brouillon").length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Étape</th><th>Objet</th><th>Statut</th><th>Prévu / envoyé</th></tr></thead>
          <tbody>
            {msgs.filter((m) => m.status !== "brouillon").map((m) => (
              <tr key={m.id}>
                <td>{m.step === 0 ? "Premier e-mail" : `Relance ${m.step}`}</td>
                <td>{m.subject}<details><summary className="muted">Voir</summary><div className="msg">{m.body}</div></details></td>
                <td><span className="badge">{m.status}</span>{m.error && <div className="error">{m.error}</div>}</td>
                <td>{fmtDate(m.sent_at ?? m.scheduled_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Fiche</h2>
      <ProspectEditor id={id} initial={p} />
      <div className="row" style={{ marginTop: 10 }}>
        {!p.do_not_contact && (
          <ActionButton url={`/api/prospects/${id}`} body={{ action: "update", fields: { do_not_contact: true, stage: "perdu" } }}
            label="Ne plus contacter" variant="danger" confirm="Ce prospect ne sera plus jamais contacté. Confirmer ?" />
        )}
      </div>

      <h2>Historique</h2>
      <div className="card">
        <NoteForm id={id} />
        <ul className="timeline">
          {(history ?? []).map((h: any) => (
            <li key={h.id}>
              <span className="muted">{fmtDate(h.created_at)}</span> — {h.classification ? `${REPLIES[h.classification]} · ` : ""}
              {h.ai_summary ?? h.content}
              {h.kind === "reponse_email" && <details><summary className="muted">Réponse complète</summary><div className="msg">{h.content}</div></details>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
