-- Connexion par pseudo + mot de passe (spec, section "Sécurité et garde-fous").
--
-- Le front appelle supabase.auth.signUp avec :
--   email    = `${pseudo}@promo.invalid`   (e-mail factice, jamais affiché)
--   password = mot de passe choisi
--   options.data = { pseudo, signup_code, pp_id }
-- Ce trigger vérifie le code d'inscription partagé et crée le profil.
-- Si le code est faux, l'inscription échoue (Auth renvoie "Database error saving new user").
--
-- Le code se règle depuis le SQL Editor de Supabase :
--   insert into private.app_config (key, value) values ('signup_code', 'le-code')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
-- Tant qu'aucun code n'est réglé, les inscriptions sont fermées.

insert into private.app_config (key, value)
values ('fake_email_domain', 'promo.invalid')
on conflict (key) do nothing;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pseudo text := lower(trim(new.raw_user_meta_data ->> 'pseudo'));
  v_code text := new.raw_user_meta_data ->> 'signup_code';
  v_pp_id text := coalesce(new.raw_user_meta_data ->> 'pp_id', 'pp_01');
  v_expected_code text;
  v_domain text;
begin
  select value into v_expected_code from private.app_config where key = 'signup_code';
  select value into v_domain from private.app_config where key = 'fake_email_domain';

  if v_expected_code is null then
    raise exception 'Inscriptions fermées : aucun code d''inscription n''est configuré'
      using errcode = 'P0001';
  end if;

  if v_code is distinct from v_expected_code then
    raise exception 'Code d''inscription invalide' using errcode = 'P0001';
  end if;

  if v_pseudo is null or lower(new.email) <> v_pseudo || '@' || v_domain then
    raise exception 'Le pseudo ne correspond pas à l''identifiant de connexion'
      using errcode = 'P0001';
  end if;

  insert into public.profiles (id, pseudo, pp_id)
  values (new.id, v_pseudo, v_pp_id);

  -- Note : le code reste dans user_metadata (Auth réécrit les métadonnées après
  -- ce trigger). Sans conséquence : seul l'utilisateur lui-même les voit.

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Helper pour les policies : l'utilisateur courant est-il admin ?
-- security definer pour lire profiles sans récursion RLS ; dans le schéma privé (non exposé).
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
