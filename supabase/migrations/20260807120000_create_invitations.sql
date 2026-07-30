-- Invite-only access: an authenticated user invites someone by email; the
-- invitee follows a link containing invite_token and sets a password in one
-- step (accept-invite Edge Function). No admin.inviteUserByEmail() and no
-- Postgres trigger -- accept-invite holds the service-role client and the
-- invitation row in the same request, so it flips status to 'accepted'
-- itself.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  status text not null default 'sent' check (status in ('sent', 'accepted')),
  invite_token uuid not null default gen_random_uuid(),
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create unique index if not exists invitations_invite_token_key on public.invitations(invite_token);
create index if not exists invitations_inviter_user_id_idx on public.invitations(inviter_user_id);

alter table public.invitations enable row level security;

-- Regular authenticated users may only see/create their own outgoing
-- invites. No update/delete policy for `authenticated` -- flipping status to
-- accepted is service-role-only, done directly inside accept-invite.
drop policy if exists "invitations_select_own" on public.invitations;
create policy "invitations_select_own"
on public.invitations
for select
to authenticated
using (inviter_user_id = auth.uid());

drop policy if exists "invitations_insert_own" on public.invitations;
create policy "invitations_insert_own"
on public.invitations
for insert
to authenticated
with check (inviter_user_id = auth.uid());
