alter table public.health_profiles
  drop constraint if exists health_profiles_height_cm_check,
  drop constraint if exists health_profiles_weight_kg_check;

alter table public.health_profiles
  add constraint health_profiles_height_cm_check check (height_cm >= 140 and height_cm <= 210),
  add constraint health_profiles_weight_kg_check check (weight_kg >= 50 and weight_kg <= 150);

grant usage, select on all sequences in schema public to authenticated;
