import "server-only";
import nodemailer from "nodemailer";

function transport() {
  const { SMTP_HOST, SMTP_PORT, MAIL_USER, MAIL_PASSWORD } = process.env;
  if (!SMTP_HOST || !MAIL_USER || !MAIL_PASSWORD) throw new Error("Configuration e-mail incomplète (SMTP_HOST, MAIL_USER, MAIL_PASSWORD)");
  const port = Number(SMTP_PORT || 465);
  return nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: MAIL_USER, pass: MAIL_PASSWORD } });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const linkify = (s: string) => s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0050EB">$1</a>');

/** Texte → HTML simple : un paragraphe par bloc, retours à la ligne conservés. */
function toHtml(text: string, imageCid?: string): string {
  const paras = text.trim().split(/\n\s*\n/).map((p) => `<p style="margin:0 0 14px">${linkify(esc(p)).replace(/\n/g, "<br>")}</p>`).join("");
  const img = imageCid ? `<p style="margin:22px 0 0"><img src="cid:${imageCid}" alt="Maquette préparée par ZEMA TECHNOLOGIES" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #E3E8F0;border-radius:8px"></p>` : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1d2433;max-width:640px">${paras}${img}</div>`;
}

export type MailImage = { data: Buffer; contentType: string };

/** Envoie un e-mail depuis la boîte OVH (texte + HTML, image éventuelle affichée en bas du message) ; renvoie l'identifiant du message. */
export async function sendMail(to: string, subject: string, text: string, opts: { inReplyTo?: string; image?: MailImage } = {}): Promise<string> {
  const from = `"${process.env.MAIL_FROM_NAME || "ZEMA TECHNOLOGIES"}" <${process.env.MAIL_USER}>`;
  const cid = opts.image ? "maquette@zematechnologies.com" : undefined;
  const ext = opts.image?.contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const info = await transport().sendMail({
    from,
    to,
    subject,
    text,
    html: toHtml(text, cid),
    ...(opts.image ? { attachments: [{ filename: `maquette.${ext}`, content: opts.image.data, contentType: opts.image.contentType, cid, contentDisposition: "inline" as const }] } : {}),
    ...(opts.inReplyTo ? { inReplyTo: opts.inReplyTo, references: opts.inReplyTo } : {}),
    headers: { "List-Unsubscribe": `<mailto:${process.env.MAIL_USER}?subject=STOP>` },
  });
  return info.messageId;
}
