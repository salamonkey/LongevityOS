-- Account-level language preference. Lives on app_user_preferences (keyed by
-- auth user), not health_profiles, because language is a property of the
-- login/account -- a single account can own several family-member health
-- profiles, and they should all render in the same chosen language rather
-- than each carrying their own. Nullable: an account that has never chosen
-- explicitly (or predates this column) falls back to the device's own
-- locale detection in LocaleContext.jsx.
alter table public.app_user_preferences
  add column if not exists locale text;

alter table public.app_user_preferences
  drop constraint if exists app_user_preferences_locale_check;
alter table public.app_user_preferences
  add constraint app_user_preferences_locale_check
  check (locale is null or locale in ('en', 'de'));
