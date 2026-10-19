"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Bouton qui appelle une route API puis rafraîchit la page. */
export function ActionButton(props: { url: string; body?: unknown; label: string; busyLabel?: string; variant?: "secondary" | "danger"; confirm?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  async function run() {
    if (props.confirm && !window.confirm(props.confirm)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(props.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(props.body ?? {}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) setMsg(`Erreur : ${data.error ?? res.status}`);
      else setMsg(summarize(data));
      router.refresh();
    } catch (e) { setMsg(`Erreur : ${String(e)}`); }
    finally { setBusy(false); }
  }
  return (
    <span className="row">
      <button className={props.variant} disabled={busy} onClick={run}>{busy ? props.busyLabel ?? "En cours…" : props.label}</button>
      {msg && <span className={msg.startsWith("Erreur") ? "error" : "ok"}>{msg}</span>}
    </span>
  );
}

function summarize(d: Record<string, any>): string {
  if (d.created !== undefined) return `${d.created} nouveau(x) prospect(s), ${d.skipped} déjà connu(s)`;
  if (d.previewUrl) return d.mockup ? "Aperçu, e-mail et maquette préparés" : "Aperçu et e-mail préparés (maquette non générée : voir l'historique)";
  if (d.score !== undefined) return `Score ${d.score}/100`;
  const parts: string[] = [];
  if (d.send) parts.push(`${d.send.sent} envoyé(s), ${d.send.failed} échec(s)`);
  if (d.inbox) parts.push(`${d.inbox.matched} réponse(s) de prospects, ${d.inbox.hot} chaude(s)`);
  if (d.reminders) parts.push(`${d.reminders.reminders} rappel(s)`);
  return parts.join(" · ") || "Fait";
}
