import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isValidInviteEmail(value: string) {
  return Boolean(value) && value.includes('@');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');
  const siteUrl = Deno.env.get('SITE_URL');

  if (!supabaseUrl || !supabaseAnonKey || !smtpHost || !smtpPort || !smtpUser || !smtpPassword || !siteUrl) {
    return jsonResponse(500, { error: 'Invites are not configured.' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return jsonResponse(401, { error: 'Not authenticated.' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return jsonResponse(401, { error: 'Not authenticated.' });
  }
  const user = userData.user;

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid request body.' });
  }

  const email = String(payload.email ?? '').trim().toLowerCase();
  if (!isValidInviteEmail(email)) {
    return jsonResponse(400, { error: 'Enter a valid email address.' });
  }

  const { data: invitation, error: insertError } = await supabase
    .from('invitations')
    .insert({ inviter_user_id: user.id, invitee_email: email })
    .select('id, invite_token, invitee_email, created_at')
    .single();

  if (insertError || !invitation) {
    console.error('Failed to create invitation row', insertError);
    return jsonResponse(500, { error: 'Could not create the invite.' });
  }

  const inviteLink = `${siteUrl}/?invite=${invitation.invite_token}&email=${encodeURIComponent(invitation.invitee_email)}`;

  try {
    // Implicit TLS (port 465), not STARTTLS (port 587): denomailer's
    // STARTTLS upgrade hits a "BadResource: Bad resource ID" inside
    // Deno.startTls() on Supabase's edge runtime -- a runtime/library
    // incompatibility, not a blocked port. Implicit TLS skips that code
    // path entirely and IONOS supports it on 465.
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: Number(smtpPort),
        tls: true,
        auth: { username: smtpUser, password: smtpPassword },
      },
    });

    await client.send({
      from: smtpUser,
      to: invitation.invitee_email,
      subject: "You're invited to Vitalis",
      content: `You've been invited to Vitalis. Open this link to set your password and get started:\n\n${inviteLink}`,
      html: `<p>You've been invited to Vitalis.</p><p><a href="${inviteLink}">Set your password to get started</a></p>`,
    });

    await client.close();
  } catch (error) {
    console.error('Failed to send invite email', error);
    return jsonResponse(502, { error: 'Could not send the invite email.' });
  }

  return jsonResponse(200, { ok: true, invitationId: invitation.id });
});
