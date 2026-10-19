import { NextResponse } from "next/server";
import { runSearch } from "@/lib/pipeline";
import { db } from "@/lib/supabase";

export const maxDuration = 300;

/** Recherche de nouveaux prospects (secteur + commune) ou ajout manuel d'une entreprise. */
export async function POST(req: Request) {
  const body = await req.json();
  try {
    if (body.mode === "manuel") {
      const { data, error } = await db().from("prospects").insert({
        company: body.company, sector: body.sector, district: body.district, website: body.website || null,
        email: body.email || null, phone: body.phone || null, decision_maker: body.decision_maker || null,
        decision_maker_role: body.decision_maker_role || null, source: "manuel",
      }).select("id").single();
      if (error) throw error;
      return NextResponse.json({ id: data.id });
    }
    const result = await runSearch(String(body.sector), String(body.district), Math.min(Number(body.max) || 10, 20));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
