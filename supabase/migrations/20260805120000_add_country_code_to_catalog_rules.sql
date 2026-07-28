-- New matching dimension for country-specific guideline sets, alongside the
-- existing gender/age/risk-flag ones already on these tables. Nullable:
-- null means "no country restriction, applies universally" (matched
-- regardless of the profile's selected guideline country) -- distinct from
-- an explicit 'CH' tag, which only matches profiles whose
-- guideline_country_code is 'CH'.
--
-- Every row in this catalog today is genuinely Swiss-sourced (EviPrev 2023 /
-- BAG Impfplan), so all existing rows get backfilled to 'CH' explicitly
-- rather than left null/universal -- leaving them null would incorrectly
-- surface unverified-for-other-countries content the moment a second
-- guideline country is ever added.
alter table public.preventive_catalog_rule_bands add column if not exists country_code text;
alter table public.preventive_catalog_vaccine_doses add column if not exists country_code text;

update public.preventive_catalog_rule_bands set country_code = 'CH' where country_code is null;
update public.preventive_catalog_vaccine_doses set country_code = 'CH' where country_code is null;

-- Widen this list in lockstep with health_profiles.guideline_country_code's
-- own check constraint whenever a new country's content is added.
alter table public.preventive_catalog_rule_bands
  drop constraint if exists preventive_catalog_rule_bands_country_code_check;
alter table public.preventive_catalog_rule_bands
  add constraint preventive_catalog_rule_bands_country_code_check
  check (country_code is null or country_code in ('CH'));

alter table public.preventive_catalog_vaccine_doses
  drop constraint if exists preventive_catalog_vaccine_doses_country_code_check;
alter table public.preventive_catalog_vaccine_doses
  add constraint preventive_catalog_vaccine_doses_country_code_check
  check (country_code is null or country_code in ('CH'));
