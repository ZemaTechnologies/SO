"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SECTORS, DISTRICTS } from "@/lib/labels";

export function SearchForm() {
  const [sector, setSector] = useState("immobilier");
  const [district, setDistrict] = useState("Cocody");
  const [max, setMax] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch("/api/prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sector, district, max }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(d.error ? `Erreur : ${d.error}` : `${d.created} nouveau(x) prospect(s) trouvé(s) et analysé(s), ${d.skipped} déjà connu(s).`);
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={run}>
      <label>Secteur
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          {Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>Commune
        <select value={district} onChange={(e) => setDistrict(e.target.value)}>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </label>
      <label>Nombre maximum
        <input type="number" min={1} max={20} value={max} onChange={(e) => setMax(Number(e.target.value))} />
      </label>
      <button disabled={busy}>{busy ? "Recherche et analyse… (1 à 3 min)" : "Trouver et analyser"}</button>
      {msg && <p className={msg.startsWith("Erreur") ? "error" : "ok"} style={{ gridColumn: "1 / -1" }}>{msg}</p>}
    </form>
  );
}

export function ManualForm() {
  const [f, setF] = useState<Record<string, string>>({ sector: "immobilier", district: "Cocody" });
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "manuel", ...f }) });
    const d = await res.json().catch(() => ({}));
    if (d.id) router.push(`/prospects/${d.id}`); else setMsg(`Erreur : ${d.error}`);
  }

  return (
    <form className="card form" onSubmit={add}>
      <label>Entreprise<input required onChange={set("company")} /></label>
      <label>Secteur<select value={f.sector} onChange={set("sector")}>{Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Commune<input value={f.district} onChange={set("district")} /></label>
      <label>Site web<input onChange={set("website")} placeholder="https://" /></label>
      <label>E-mail<input type="email" onChange={set("email")} /></label>
      <label>Téléphone<input onChange={set("phone")} /></label>
      <label>Décideur<input onChange={set("decision_maker")} /></label>
      <label>Fonction<input onChange={set("decision_maker_role")} placeholder="DG, Marketing…" /></label>
      <button>Ajouter</button>
      {msg && <p className="error">{msg}</p>}
    </form>
  );
}
