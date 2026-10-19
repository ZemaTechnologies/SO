import { NextResponse, type NextRequest } from "next/server";
import { sendDue, processInbox, processReminders } from "@/lib/pipeline";

export const maxDuration = 300;

/** Tâches automatiques : envoi des messages dus, lecture des réponses, rappels.
 *  Appelée par la planification (en-tête Authorization: Bearer CRON_SECRET) ou par un bouton du tableau de bord. */
async function handle(req: NextRequest) {
  const bearer = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` && !!process.env.CRON_SECRET;
  const session = !!process.env.APP_SESSION_TOKEN && req.cookies.get("so_session")?.value === process.env.APP_SESSION_TOKEN;
  if (!bearer && !session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const task = req.nextUrl.searchParams.get("task") ?? "all";
  const result: Record<string, unknown> = {};
  try {
    if (task === "inbox" || task === "all") result.inbox = await processInbox();
    if (task === "reminders" || task === "all") result.reminders = await processReminders();
    if (task === "send" || task === "all") result.send = await sendDue();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ...result, error: String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
