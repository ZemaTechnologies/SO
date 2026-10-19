import { NextResponse } from "next/server";
import { approveMessage } from "@/lib/pipeline";
import { db } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (body.action === "approve") await approveMessage(id, body.subject, body.body);
  else if (body.action === "cancel") await db().from("messages").update({ status: "annule" }).eq("id", id);
  else if (body.action === "save") await db().from("messages").update({ subject: body.subject, body: body.body }).eq("id", id);
  else return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
