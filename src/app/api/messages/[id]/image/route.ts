import { NextResponse } from "next/server";
import { db, saveImage, loadImage, removeImage } from "@/lib/supabase";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX = 4 * 1024 * 1024; // 4 Mo : au-delà, l'e-mail devient lourd

async function current(id: string): Promise<string | null> {
  const { data } = await db().from("messages").select("image_path").eq("id", id).single();
  return data?.image_path ?? null;
}

/** Affiche l'image de la maquette de ce message (page de validation). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = await current(id);
  const img = path ? await loadImage(path) : null;
  if (!img) return new NextResponse("Aucune image", { status: 404 });
  return new NextResponse(new Uint8Array(img.data), { headers: { "Content-Type": img.contentType, "Cache-Control": "no-store" } });
}

/** Remplace la maquette par une image envoyée ou collée par Michael. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucune image reçue" }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Format accepté : PNG, JPG, WEBP ou GIF" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Image trop lourde (4 Mo maximum)" }, { status: 400 });
  try {
    const old = await current(id);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${id}-${Date.now()}.${ext}`;
    await saveImage(path, Buffer.from(await file.arrayBuffer()), file.type);
    await db().from("messages").update({ image_path: path }).eq("id", id);
    if (old) await removeImage(old).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/** Retire l'image : l'e-mail partira sans maquette. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const old = await current(id);
  await db().from("messages").update({ image_path: null }).eq("id", id);
  if (old) await removeImage(old).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
