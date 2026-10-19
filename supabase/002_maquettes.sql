-- SŌ by ZEMA TECHNOLOGIES — maquettes en image dans le premier e-mail
-- À exécuter une fois dans Supabase : SQL Editor > New query > coller > Run.

-- Image (maquette générée ou importée) affichée en bas du message
alter table messages add column if not exists image_path text;

-- Espace de stockage privé des images (lu uniquement par SŌ avec la clé secrète)
insert into storage.buckets (id, name, public)
values ('mockups', 'mockups', false)
on conflict (id) do nothing;
