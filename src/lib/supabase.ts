import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Client Supabase côté serveur uniquement (clé secrète, jamais envoyée au navigateur). */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY manquante dans .env.local");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type Prospect = {
  id: string;
  company: string;
  sector: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  decision_maker: string | null;
  decision_maker_role: string | null;
  source: string | null;
  google_place_id: string | null;
  score: number | null;
  score_details: Record<string, number> | null;
  main_opportunity: string | null;
  opportunity_reason: string | null;
  stage: string;
  last_reply_class: string | null;
  is_hot: boolean;
  do_not_contact: boolean;
  next_action_at: string | null;
  next_action_note: string | null;
  deal_value_fcfa: number | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  prospect_id: string;
  channel: string;
  step: number;
  subject: string | null;
  body: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  approved_at: string | null;
  error: string | null;
  created_at: string;
};
