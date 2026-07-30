import { getSupabaseClient } from '../../lib/persistence/supabaseLivePlans.js';
import { normalizeInviteEmail, isValidInviteEmail } from './model.js';

export async function sendInvite(email) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const normalizedEmail = normalizeInviteEmail(email);
  if (!isValidInviteEmail(normalizedEmail)) {
    throw new Error('Enter a valid email address.');
  }

  const { data, error } = await client.functions.invoke('send-invite', {
    body: { email: normalizedEmail },
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function listSentInvites() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw userError;
  }
  const userId = userData?.user?.id;
  if (!userId) {
    throw new Error('You are not authenticated.');
  }

  const { data, error } = await client
    .from('invitations')
    .select('id, invitee_email, status, created_at, accepted_at')
    .eq('inviter_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.invitee_email,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
  }));
}

export async function acceptInvite({ token, email, password }) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const { data, error } = await client.functions.invoke('accept-invite', {
    body: { token, email: normalizeInviteEmail(email), password },
  });
  if (error) {
    throw error;
  }
  return data;
}
