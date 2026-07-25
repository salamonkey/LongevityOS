-- Localization foundation, DB layer. Catalog copy (cadence_label, why_it_matters,
-- recommendation_text) lives on preventive_catalog_items as single English
-- columns with no locale dimension. This table adds per-locale overrides
-- without touching those base columns — a locale with no row, or a row with a
-- null field, falls back to the English base column. A translations table
-- (rather than per-locale columns like why_it_matters_de) scales to more
-- languages later without a schema migration per language.

create table if not exists public.preventive_catalog_item_translations (
  item_id text not null references public.preventive_catalog_items(item_id) on delete cascade,
  locale text not null,
  cadence_label text,
  why_it_matters text,
  recommendation_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (item_id, locale)
);

create index if not exists preventive_catalog_item_translations_locale_idx
  on public.preventive_catalog_item_translations(locale);

alter table public.preventive_catalog_item_translations enable row level security;

drop policy if exists "preventive_catalog_item_translations_select_all" on public.preventive_catalog_item_translations;
create policy "preventive_catalog_item_translations_select_all"
on public.preventive_catalog_item_translations
for select
to anon, authenticated
using (true);

grant select on public.preventive_catalog_item_translations to anon, authenticated;
