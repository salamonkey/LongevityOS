
import process from 'node:process';

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

export function resolveLlmSettings(values = {}, env = process.env, purpose = 'intake') {
  const upperPurpose = String(purpose || 'intake').toUpperCase();
  const prefix = purpose ? `${purpose}_` : '';
  const apiKeyEnv = String(firstDefined(
    values[`${prefix}llm_api_key_env`],
    values.llm_api_key_env,
    env[`${upperPurpose}_LLM_API_KEY_ENV`],
    env.LLM_API_KEY_ENV,
    'OPENAI_API_KEY',
  )).trim();
  return {
    purpose,
    enabled: String(firstDefined(values[`${prefix}llm_enabled`], values.llm_enabled, env[`${upperPurpose}_LLM_ENABLED`], env.LLM_ENABLED, 'false')).toLowerCase() === 'true',
    provider: String(firstDefined(values[`${prefix}llm_provider`], values.llm_provider, env[`${upperPurpose}_LLM_PROVIDER`], env.LLM_PROVIDER, 'openai')).trim(),
    model: String(firstDefined(values[`${prefix}llm_model`], values.llm_model, env[`${upperPurpose}_LLM_MODEL`], env.LLM_MODEL, 'gpt-5.4')).trim(),
    apiKeyEnv,
    apiKey: apiKeyEnv ? env[apiKeyEnv] || null : null,
    baseURL: firstDefined(values[`${prefix}llm_base_url`], values.llm_base_url, env[`${upperPurpose}_LLM_BASE_URL`], env.LLM_BASE_URL),
    organization: firstDefined(values[`${prefix}llm_organization`], values.llm_organization, env[`${upperPurpose}_LLM_ORGANIZATION`], env.LLM_ORGANIZATION),
    project: firstDefined(values[`${prefix}llm_project`], values.llm_project, env[`${upperPurpose}_LLM_PROJECT`], env.LLM_PROJECT),
    reasoningEffort: String(firstDefined(values[`${prefix}llm_reasoning_effort`], values.llm_reasoning_effort, env[`${upperPurpose}_LLM_REASONING_EFFORT`], env.LLM_REASONING_EFFORT, 'medium')).trim(),
    verbosity: String(firstDefined(values[`${prefix}llm_verbosity`], values.llm_verbosity, env[`${upperPurpose}_LLM_VERBOSITY`], env.LLM_VERBOSITY, 'medium')).trim(),
    maxOutputTokens: Number(firstDefined(values[`${prefix}llm_max_output_tokens`], values.llm_max_output_tokens, env[`${upperPurpose}_LLM_MAX_OUTPUT_TOKENS`], env.LLM_MAX_OUTPUT_TOKENS, 12000)),
    temperature: firstDefined(values[`${prefix}llm_temperature`], values.llm_temperature, env[`${upperPurpose}_LLM_TEMPERATURE`], env.LLM_TEMPERATURE),
    stdioCommand: firstDefined(values[`${prefix}llm_stdio_command`], values.llm_stdio_command, env[`${upperPurpose}_LLM_STDIO_COMMAND`], env.LLM_STDIO_COMMAND),
    stdioArgs: firstDefined(values[`${prefix}llm_stdio_args`], values.llm_stdio_args, env[`${upperPurpose}_LLM_STDIO_ARGS`], env.LLM_STDIO_ARGS),
  };
}

export function validateLlmSettings(settings) {
  const errors = [];
  if (!settings.enabled) errors.push('LLM invocation disabled. Set intake_llm_enabled=true or LLM_ENABLED=true.');
  if (!settings.provider) errors.push('Missing llm provider.');
  if (settings.provider === 'openai') {
    if (!settings.model) errors.push('Missing llm model for openai provider.');
    if (!settings.apiKey) errors.push(`Missing API key in env var ${settings.apiKeyEnv}.`);
  }
  if (settings.provider === 'stdio_json' && !settings.stdioCommand) {
    errors.push('Missing intake_llm_stdio_command for stdio_json provider.');
  }
  return { ok: errors.length === 0, errors };
}
