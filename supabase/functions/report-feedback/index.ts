import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_CATEGORIES = ['bug', 'feedback', 'idea', 'other'];
const DESCRIPTION_MAX_LENGTH = 2000;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
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
  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const githubRepo = Deno.env.get('GITHUB_REPO');

  if (!supabaseUrl || !supabaseAnonKey || !githubToken || !githubRepo) {
    return jsonResponse(500, { error: 'Feedback reporting is not configured.' });
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

  const category = String(payload.category ?? '').trim();
  const description = String(payload.description ?? '').trim();
  const route = String(payload.route ?? '').trim();
  const appVersion = String(payload.appVersion ?? '').trim();

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return jsonResponse(400, { error: 'Choose a valid category.' });
  }
  if (!description) {
    return jsonResponse(400, { error: 'Description is required.' });
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return jsonResponse(400, { error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.` });
  }

  const title = `[alpha][${category}] ${truncate(description, 60)}`;
  const body = [
    description,
    '',
    '---',
    `Category: ${category}`,
    `Reporter: ${user.email ?? 'unknown'} (${user.id})`,
    appVersion ? `App version: ${appVersion}` : null,
    route ? `Route: ${route}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');

  let githubResponse: Response;
  try {
    githubResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'korrum-health-feedback',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, labels: ['alpha-feedback'] }),
    });
  } catch (error) {
    console.error('GitHub request failed', error);
    return jsonResponse(502, { error: 'Could not reach GitHub.' });
  }

  if (!githubResponse.ok) {
    const errorBody = await githubResponse.text();
    console.error('GitHub issue creation failed', githubResponse.status, errorBody);
    return jsonResponse(502, { error: 'Could not create the issue on GitHub.' });
  }

  const issue = await githubResponse.json();
  return jsonResponse(200, { issueNumber: issue.number, issueUrl: issue.html_url });
});
