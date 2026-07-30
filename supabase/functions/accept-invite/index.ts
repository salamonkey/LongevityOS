import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Invites are not configured.' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_token' });
  }

  const token = String(payload.token ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const password = String(payload.password ?? '');

  if (!UUID_PATTERN.test(token)) {
    return jsonResponse(400, { error: 'invalid_token' });
  }
  if (!email || !email.includes('@')) {
    return jsonResponse(400, { error: 'invalid_token' });
  }
  if (password.length < 8) {
    return jsonResponse(400, { error: 'password_too_short' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: invitation, error: lookupError } = await supabase
    .from('invitations')
    .select('id, invitee_email, status, expires_at')
    .eq('invite_token', token)
    .maybeSingle();

  if (lookupError || !invitation) {
    return jsonResponse(404, { error: 'invalid_token' });
  }
  if (invitation.status !== 'sent') {
    return jsonResponse(409, { error: 'already_used' });
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return jsonResponse(410, { error: 'expired' });
  }
  if (invitation.invitee_email.toLowerCase() !== email) {
    return jsonResponse(403, { error: 'email_mismatch' });
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: invitation.invitee_email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    if (createError?.code === 'email_exists') {
      return jsonResponse(409, { error: 'email_exists' });
    }
    console.error('Failed to create invited user', createError);
    return jsonResponse(500, { error: 'create_user_failed' });
  }

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_user_id: created.user.id, accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  if (updateError) {
    // Account was created successfully; a missed status flip is cosmetic
    // for the inviter's list, not a blocker for the invitee signing in.
    console.error('Failed to mark invitation accepted', updateError);
  }

  return jsonResponse(200, { ok: true });
});
