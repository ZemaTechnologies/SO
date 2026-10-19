import { NextResponse } from "next/server";
import { analyzeProspect, prepareOutreach } from "@/lib/pipeline";
import { db } from "@/lib/supabase";

export const maxDuration = 120;

const EDITABLE = ["company", "website", "email", "phone", "whatsapp", "decision_maker", "decision_maker_role",
  "facebook_url", "instagram_url", "linkedin_url", "stage", "deal_value_fcfa", "next_action_at", "next_action_note", "do_not_contact"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    if (body.action === "analyze") return NextResponse.json(await analyzeProspect(id));
    if (body.action === "prepare") return NextResponse.json(await prepareOutreach(id));
    if (body.action === "note") {
      await db().from("interactions").insert({ prospect_id: id, kind: "note", content: String(body.content ?? "") });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "update") {
      const patch = Object.fromEntries(Object.entries(body.fields ?? {}).filter(([k]) => EDITABLE.includes(k)).map(([k, v]) => [k, v === "" ? null : v]));
      const { data: before } = await db().from("prospects").select("email, do_not_contact").eq("id", id).single();
      await db().from("prospects").update(patch).eq("id", id);
      if (patch.stage) await db().from("interactions").insert({ prospect_id: id, kind: "changement_etape", content: `Étape : ${patch.stage}` });
      if (patch.do_not_contact === true && !before?.do_not_contact) {
        if (before?.email) await db().from("suppression_list").insert({ email: before.email, reason: "Ajouté manuellement" });
        await db().from("messages").update({ status: "annule" }).eq("prospect_id", id).in("status", ["brouillon", "valide", "programme"]);
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
