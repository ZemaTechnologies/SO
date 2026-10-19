"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES } from "@/lib/labels";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json().catch(() => ({}));
}

/** Édition d'un e-mail avant validation, avec la maquette affichée en bas du message. */
export function MessageEditor({ id, subject, body, hasImage = false }: { id: string; subject: string; body: string; hasImage?: boolean }) {
  const [s, setS] = useState(subject);
  const [b, setB] = useState(body);
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState(hasImage);
  const [version, setVersion] = useState(0);
  const [imgMsg, setImgMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function act(action: string) {
    setBusy(true);
    await post(`/api/messages/${id}`, { action, subject: s, body: b });
    setBusy(false);
    router.refresh();
  }

  async function upload(file: File | null | undefined) {
    if (!file) return;
    setBusy(true); setImgMsg("Envoi de l'image…");
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`/api/messages/${id}/image`, { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || d.error) { setImgMsg(`Erreur : ${d.error ?? res.status}`); return; }
    setImg(true); setVersion((v) => v + 1); setImgMsg("Image remplacée");
  }

  async function removeImg() {
    setBusy(true);
    await fetch(`/api/messages/${id}/image`, { method: "DELETE" });
    setBusy(false); setImg(false); setImgMsg("Image retirée : l'e-mail partira sans maquette");
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) { e.preventDefault(); upload(item.getAsFile()); }
  }

  return (
    <div className="grid">
      <label>Objet<input value={s} onChange={(e) => setS(e.target.value)} /></label>
      <label>Message<textarea value={b} onChange={(e) => setB(e.target.value)} /></label>
      <div className="card" tabIndex={0} onPaste={onPaste} style={{ outline: "none" }}>
        <strong>Image en bas de l'e-mail (maquette)</strong>
        <p className="muted" style={{ margin: "4px 0 10px" }}>Affichée en entier dans le message, pas en pièce jointe. Pour la remplacer : bouton ci-dessous, ou cliquez dans ce cadre puis collez une image (Ctrl + V).</p>
        {img
          ? <img src={`/api/messages/${id}/image?v=${version}`} alt="Maquette" style={{ display: "block", width: "100%", maxWidth: 600, border: "1px solid #e3e8f0", borderRadius: 8 }} />
          : <p className="muted">Aucune image : l'e-mail partira sans maquette.</p>}
        <div className="row" style={{ marginTop: 10 }}>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" disabled={busy} className="secondary" onClick={() => fileRef.current?.click()}>{img ? "Remplacer par mon image" : "Ajouter mon image"}</button>
          {img && <button type="button" disabled={busy} className="danger" onClick={removeImg}>Retirer l'image</button>}
          {imgMsg && <span className={imgMsg.startsWith("Erreur") ? "error" : "ok"}>{imgMsg}</span>}
        </div>
      </div>
      <div className="row">
        <button disabled={busy} onClick={() => act("approve")}>Valider et envoyer</button>
        <button disabled={busy} className="secondary" onClick={() => act("save")}>Enregistrer</button>
        <button disabled={busy} className="danger" onClick={() => act("cancel")}>Annuler ce message</button>
      </div>
    </div>
  );
}

const FIELDS: [string, string][] = [
  ["company", "Entreprise"], ["decision_maker", "Décideur"], ["decision_maker_role", "Fonction"], ["email", "E-mail"],
  ["phone", "Téléphone"], ["whatsapp", "WhatsApp"], ["website", "Site web"], ["facebook_url", "Facebook"],
  ["instagram_url", "Instagram"], ["linkedin_url", "LinkedIn"], ["deal_value_fcfa", "Montant devis / vente (FCFA)"],
];

/** Fiche prospect modifiable. */
export function ProspectEditor({ id, initial }: { id: string; initial: Record<string, any> }) {
  const [f, setF] = useState<Record<string, any>>(initial);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  async function save() {
    const fields = { ...f, deal_value_fcfa: f.deal_value_fcfa ? Number(f.deal_value_fcfa) : null,
      next_action_at: f.next_action_at ? new Date(f.next_action_at).toISOString() : null };
    await post(`/api/prospects/${id}`, { action: "update", fields });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }
  return (
    <div className="card">
      <div className="form">
        {FIELDS.map(([k, l]) => (
          <label key={k}>{l}<input value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
        ))}
        <label>Étape
          <select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>
            {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Rappel le<input type="date" value={(f.next_action_at ?? "").slice(0, 10)} onChange={(e) => setF({ ...f, next_action_at: e.target.value })} /></label>
        <label>Note du rappel<input value={f.next_action_note ?? ""} onChange={(e) => setF({ ...f, next_action_note: e.target.value })} /></label>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button onClick={save}>Enregistrer la fiche</button>
        {saved && <span className="ok">Enregistré</span>}
      </div>
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const [t, setT] = useState("");
  const router = useRouter();
  return (
    <div className="row">
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Ajouter une note (appel, échange…)" style={{ flex: 1 }} />
      <button className="secondary" onClick={async () => { if (!t) return; await post(`/api/prospects/${id}`, { action: "note", content: t }); setT(""); router.refresh(); }}>Ajouter</button>
    </div>
  );
}
