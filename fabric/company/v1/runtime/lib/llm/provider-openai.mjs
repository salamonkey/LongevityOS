function buildResponsesUrl(baseURL) {
  const root = String(baseURL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (!root) {
    throw new Error('OpenAI base URL is empty.');
  }
  return `${root}/responses`;
}

function extractOutputText(responseJson) {
  const direct = String(responseJson?.output_text || '').trim();
  if (direct) return direct;
  const fragments = [];
  const outputs = Array.isArray(responseJson?.output) ? responseJson.output : [];
  for (const item of outputs) {
    if (String(item?.type || '') !== 'message') continue;
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (String(block?.type || '') !== 'output_text') continue;
      const text = String(block?.text || '').trim();
      if (text) fragments.push(text);
    }
  }
  return fragments.join('\n').trim();
}

function summarizeOpenAiError(status, responseJson, responseText) {
  const message = String(
    responseJson?.error?.message
      || responseJson?.message
      || responseText
      || 'Unknown OpenAI error',
  ).trim();
  const code = String(responseJson?.error?.code || '').trim();
  return `OpenAI request failed (${status}${code ? ` ${code}` : ''}): ${message}`;
}

export async function invokeOpenAIStructured({ settings, taskName, systemPrompt, userPrompt, schema, signal }) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable in this Node runtime.');
  }
  const url = buildResponsesUrl(settings.baseURL);
  const headers = {
    Authorization: `Bearer ${settings.apiKey}`,
    'Content-Type': 'application/json',
  };
  if (settings.organization) {
    headers['OpenAI-Organization'] = String(settings.organization);
  }
  if (settings.project) {
    headers['OpenAI-Project'] = String(settings.project);
  }

  const payload = {
    model: settings.model,
    reasoning: { effort: settings.reasoningEffort || 'medium' },
    max_output_tokens: settings.maxOutputTokens || 12000,
    temperature: settings.temperature == null ? undefined : Number(settings.temperature),
    input: [
      { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
      { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
    ],
    text: {
      verbosity: settings.verbosity || 'medium',
      format: {
        type: 'json_schema',
        name: taskName.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 64) || 'structured_output',
        strict: true,
        schema,
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });
  const responseText = await response.text();
  let responseJson = null;
  try {
    responseJson = responseText ? JSON.parse(responseText) : {};
  } catch (_) {
    responseJson = null;
  }
  if (!response.ok) {
    throw new Error(summarizeOpenAiError(response.status, responseJson, responseText));
  }
  const rawText = extractOutputText(responseJson);
  if (!rawText) {
    throw new Error(
      `Model returned empty structured output. Response id: ${String(responseJson?.id || 'unknown')}`,
    );
  }
  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse structured model output as JSON: ${String(error?.message || error)}\nRaw output:\n${rawText}`,
    );
  }
}
