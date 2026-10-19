-- SO by ZEMA TECHNOLOGIES — schéma de la semaine 1 (prospection)
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run.

create extension if not exists "pgcrypto";

-- Marques (ZEMA, Testor, CVBoost… ; prêt pour le multi-marques)
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  knowledge_md text,               -- base de connaissance de la marque
  created_at timestamptz not null default now()
);

-- Étapes du pipeline commercial
create type pipeline_stage as enum (
  'identifie', 'analyse', 'qualifie', 'contacte', 'relance_1', 'relance_2',
  'reponse', 'lead_qualifie', 'rdv', 'proposition', 'negociation', 'gagne', 'perdu'
);

-- Classement des réponses
create type reply_class as enum (
  'interesse', 'a_relancer', 'demande_infos', 'pas_maintenant', 'refus', 'ne_plus_contacter'
);

-- Prospects (une ligne par entreprise)
create table prospects (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  company text not null,
  sector text,                     -- immobilier, btp, services_pro…
  city text default 'Abidjan',
  district text,                   -- Cocody, Marcory, Plateau…
  address text,
  website text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  email text,
  phone text,
  whatsapp text,
  decision_maker text,
  decision_maker_role text,
  source text,                     -- google_places, import, manuel, reseaux…
  google_place_id text unique,
  score int check (score between 0 and 100),
  score_details jsonb,             -- détail des critères du score
  main_opportunity text,           -- offre ZEMA proposée en priorité
  opportunity_reason text,
  stage pipeline_stage not null default 'identifie',
  last_reply_class reply_class,
  is_hot boolean not null default false,
  do_not_contact boolean not null default false,
  next_action_at timestamptz,      -- prochaine relance ou rappel
  next_action_note text,
  deal_value_fcfa bigint,          -- montant si devis ou vente
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on prospects (stage);
create index on prospects (score desc);
create index on prospects (next_action_at);

-- Analyse digitale (site, réseaux), une ou plusieurs par prospect
create table analyses (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  site_exists boolean,
  site_up boolean,
  https boolean,
  mobile_friendly boolean,
  performance_score int,           -- PageSpeed 0-100
  has_whatsapp_link boolean,
  has_contact_form boolean,
  has_clear_cta boolean,
  seo_basics jsonb,                -- title, description, h1…
  social_presence jsonb,           -- plateformes, dernière publication…
  summary text,                    -- résumé rédigé par l'IA
  raw jsonb,
  created_at timestamptz not null default now()
);

-- Aperçu personnalisé envoyé au prospect (page publique)
create table previews (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  slug text not null unique,       -- lien court non devinable
  content jsonb not null,          -- observations, opportunité, maquette…
  view_count int not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Messages préparés et envoyés (séquence J0, J+3, J+7)
create table messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  channel text not null default 'email',   -- email, linkedin_manuel, whatsapp
  step int not null default 0,              -- 0 = premier contact, 1, 2 = relances
  subject text,
  body text not null,
  status text not null default 'brouillon', -- brouillon, valide, programme, envoye, annule, echec
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  approved_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index on messages (status, scheduled_at);

-- Historique complet : réponses reçues, notes, appels, changements d'étape
create table interactions (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  kind text not null,              -- reponse_email, note, appel, rdv, changement_etape, alerte
  content text,
  classification reply_class,
  ai_summary text,
  created_at timestamptz not null default now()
);
create index on interactions (prospect_id, created_at desc);

-- Liste globale « ne plus contacter » (e-mail ou domaine entier)
create table suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text,
  domain text,
  reason text,
  created_at timestamptz not null default now(),
  check (email is not null or domain is not null)
);

-- Notifications pour Michael (lead chaud, échec d'envoi, rappel)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete set null,
  kind text not null,              -- lead_chaud, echec, rappel, point_du_matin
  title text not null,
  body text,
  sent_via text,                   -- email, whatsapp
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Mise à jour automatique de updated_at
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger prospects_touch before update on prospects
  for each row execute function touch_updated_at();

-- Sécurité : seules les personnes connectées (vous) accèdent aux données.
alter table brands enable row level security;
alter table prospects enable row level security;
alter table analyses enable row level security;
alter table previews enable row level security;
alter table messages enable row level security;
alter table interactions enable row level security;
alter table suppression_list enable row level security;
alter table notifications enable row level security;

create policy "auth_all" on brands for all to authenticated using (true) with check (true);
create policy "auth_all" on prospects for all to authenticated using (true) with check (true);
create policy "auth_all" on analyses for all to authenticated using (true) with check (true);
create policy "auth_all" on previews for all to authenticated using (true) with check (true);
create policy "auth_all" on messages for all to authenticated using (true) with check (true);
create policy "auth_all" on interactions for all to authenticated using (true) with check (true);
create policy "auth_all" on suppression_list for all to authenticated using (true) with check (true);
create policy "auth_all" on notifications for all to authenticated using (true) with check (true);

-- Marque de départ
insert into brands (name) values ('ZEMA TECHNOLOGIES');
