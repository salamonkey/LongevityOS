-- Which country's preventive-care guidelines this profile follows -- a
-- distinct concept from country_code (country of residence, added by
-- 20260724120000): an expat may reside in one country but want to keep
-- following another country's guidelines, or vice versa. Only ever holds a
-- country this catalog actually has a ruleset for (today, only Switzerland)
-- -- unlike country_code, which also accepts 'OTHER' as a catch-all for
-- residence.
--
-- Defaults every profile to 'CH' regardless of country of residence, since
-- that's the only ruleset that exists yet -- defaulting from country_code
-- instead would silently produce an empty plan for a DE/AT/OTHER resident.
-- The default is intentionally left in place (not dropped, unlike
-- country_code's own migration) since there's no picker UI for this yet --
-- every new profile should keep auto-defaulting to 'CH' until one exists.
alter table public.health_profiles
  add column if not exists guideline_country_code text not null default 'CH'
  check (guideline_country_code in ('CH'));
