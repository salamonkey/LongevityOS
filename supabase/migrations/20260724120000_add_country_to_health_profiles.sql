alter table public.health_profiles
  add column country_code text not null default 'DE'
  check (country_code in ('DE', 'AT', 'CH', 'OTHER'));

alter table public.health_profiles
  alter column country_code drop default;
