
export async function invokeOpenAIStructured({ settings, taskName, systemPrompt, userPrompt, schema }) {
  let OpenAI;
  try {
    ({ default: OpenAI } = await import('openai'));
  } catch (error) {
    throw new Error(`OpenAI SDK not installed. Run npm install openai. (${String(error?.message || error)})`);
  }

  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL || undefined,
    organization: settings.organization || undefined,
    project: settings.project || undefined,
  });

  const response = await client.responses.create({
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
  });

  const rawText = String(response.output_text || '').trim();
  if (!rawText) throw new Error('Model returned empty output_text for structured request.');
  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Failed to parse structured model output as JSON: ${String(error?.message || error)}\nRaw output:\n${rawText}`);
  }
}
