import "server-only";
import nodemailer from "nodemailer";

function transport() {
  const { SMTP_HOST, SMTP_PORT, MAIL_USER, MAIL_PASSWORD } = process.env;
  if (!SMTP_HOST || !MAIL_USER || !MAIL_PASSWORD) throw new Error("Configuration e-mail incomplète (SMTP_HOST, MAIL_USER, MAIL_PASSWORD)");
  const port = Number(SMTP_PORT || 465);
  return nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: MAIL_USER, pass: MAIL_PASSWORD } });
}

/** Envoie un e-mail texte depuis la boîte OVH ; renvoie l'identifiant du message. */
export async function sendMail(to: string, subject: string, text: string, inReplyTo?: string): Promise<string> {
  const from = `"${process.env.MAIL_FROM_NAME || "ZEMA TECHNOLOGIES"}" <${process.env.MAIL_USER}>`;
  const info = await transport().sendMail({
    from,
    to,
    subject,
    text,
    ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    headers: { "List-Unsubscribe": `<mailto:${process.env.MAIL_USER}?subject=STOP>` },
  });
  return info.messageId;
}
