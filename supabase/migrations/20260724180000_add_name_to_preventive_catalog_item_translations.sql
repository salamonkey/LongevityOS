-- The translations table originally covered only cadence_label/why_it_matters/
-- recommendation_text; item display names were left English-only. That made
-- the German experience look half-finished (translated cadence/why-it-matters
-- text sitting under a still-English item title). Add name so the whole
-- catalog item can be localized.

alter table public.preventive_catalog_item_translations
  add column if not exists name text;
