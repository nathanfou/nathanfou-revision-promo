-- Cours : une fiche de cours par chapitre (Markdown au format du Labo : KaTeX, encadrés,
-- figures [[widget:...]]). Écrite par l'import (clé secrète) ; le navigateur la lit seulement.
-- `source` : auteur ou origine du contenu, affiché en remerciement sur la page du cours.
create table public.courses (
  chapter_id uuid primary key references public.chapters (id) on delete cascade,
  contenu text not null,
  source text,
  statut public.content_status not null default 'brouillon',
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

grant select on public.courses to authenticated;

create policy "cours publiés lisibles" on public.courses for select to authenticated
  using (statut = 'publie' or (select private.is_admin()));
