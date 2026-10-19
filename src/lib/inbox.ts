import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type IncomingMail = { uid: number; from: string; subject: string; text: string; date: Date };

/** Lit les e-mails non lus de la boîte de réception et les marque comme lus. */
export async function fetchUnread(limit = 50): Promise<IncomingMail[]> {
  const { IMAP_HOST, IMAP_PORT, MAIL_USER, MAIL_PASSWORD } = process.env;
  if (!IMAP_HOST || !MAIL_USER || !MAIL_PASSWORD) throw new Error("Configuration IMAP incomplète (IMAP_HOST, MAIL_USER, MAIL_PASSWORD)");
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: Number(IMAP_PORT || 993),
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_PASSWORD },
    logger: false,
  });
  await client.connect();
  const out: IncomingMail[] = [];
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = (await client.search({ seen: false }, { uid: true })) || [];
    for (const uid of uids.slice(-limit)) {
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const parsed = await simpleParser(msg.source);
      out.push({
        uid,
        from: (parsed.from?.value?.[0]?.address || "").toLowerCase(),
        subject: parsed.subject || "",
        text: stripQuoted(parsed.text || ""),
        date: parsed.date || new Date(),
      });
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return out;
}

/** Retire l'historique cité (« Le … a écrit : ») pour ne garder que la réponse. */
function stripQuoted(text: string): string {
  const cut = text.search(/\n(?:Le .{5,80}a écrit|On .{5,80}wrote|-{2,}\s*Original|De\s?:|From:)/i);
  return (cut > 0 ? text.slice(0, cut) : text).trim().slice(0, 4000);
}
