#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += String(chunk);
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function parseJsonStrict(text, label) {
  try {
    return JSON.parse(String(text || ''));
  } catch (error) {
    throw new Error(`Failed to parse ${label} JSON: ${String(error?.message || error)}`);
  }
}

function extractJsonObject(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) {
    throw new Error('Codex returned empty response text.');
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    // Continue with relaxed extraction.
  }

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    try {
      return JSON.parse(String(fencedMatch[1] || '').trim());
    } catch (_) {
      // Continue with brace slicing fallback.
    }
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = raw.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced);
    } catch (_) {
      // Continue to final error below.
    }
  }

  throw new Error('Could not extract a valid JSON object from Codex output.');
}

function buildPrompt({ taskName, systemPrompt, userPrompt }) {
  const name = String(taskName || 'structured_task').trim();
  const system = String(systemPrompt || '').trim();
  const user = String(userPrompt || '').trim();
  return [
    `Task: ${name}`,
    '',
    'Follow these rules exactly:',
    '1) Treat the "System Prompt" as highest-priority instructions.',
    '2) Treat the "User Prompt" as task content.',
    '3) Return only valid JSON that matches the provided output schema.',
    '4) Do not include markdown fences or commentary.',
    '',
    'System Prompt:',
    system,
    '',
    'User Prompt:',
    user,
  ].join('\n');
}

function runCodexExec({
  codexBin,
  promptText,
  schemaPath,
  outputPath,
  model,
  traceEnabled,
}) {
  return new Promise((resolve, reject) => {
    const args = [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--disable',
      'general_analytics',
      '--sandbox',
      'workspace-write',
      '--color',
      'never',
      '--output-schema',
      schemaPath,
      '--output-last-message',
      outputPath,
      '-',
    ];
    if (model) {
      args.splice(1, 0, '--model', String(model));
    }
    if (traceEnabled) {
      args.splice(1, 0, '--json');
    }

    const child = spawn(codexBin, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      stdout += text;
      if (traceEnabled) {
        process.stderr.write(text);
      }
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      stderr += text;
      if (traceEnabled) {
        process.stderr.write(text);
      }
    });
    child.on('error', (error) => {
      reject(new Error(`Failed to start Codex process (${codexBin}): ${String(error?.message || error)}`));
    });
    child.on('close', (code) => {
      if (code !== 0) {
        const outputExists = fs.existsSync(outputPath);
        const outputText = outputExists ? fs.readFileSync(outputPath, 'utf8') : '';
        if (outputText.trim().length > 0) {
          resolve();
          return;
        }
        const stdoutMsg = stdout.trim();
        const stderrMsg = stderr.trim();
        const parts = [`Codex exited with code ${String(code)}.`];
        if (stdoutMsg) parts.push(`stdout: ${stdoutMsg}`);
        if (stderrMsg) parts.push(`stderr: ${stderrMsg}`);
        reject(new Error(parts.join(' ')));
        return;
      }
      resolve();
    });

    child.stdin.write(promptText);
    child.stdin.end();
  });
}

async function main() {
  const inputText = await readStdin();
  const payload = parseJsonStrict(inputText, 'bridge input');

  const taskName = String(payload?.taskName || 'structured_task');
  const systemPrompt = String(payload?.systemPrompt || '');
  const userPrompt = String(payload?.userPrompt || '');
  const schema = payload?.schema || { type: 'object' };
  const model = String(payload?.settings?.model || '').trim();
  const traceEnabled = (
    String(payload?.settings?.stdioTrace || '').toLowerCase() === 'true'
    || String(process.env.CODEX_BRIDGE_TRACE || '').toLowerCase() === 'true'
  );

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fabric-codex-bridge-'));
  const schemaPath = path.join(tempDir, 'schema.json');
  const outputPath = path.join(tempDir, 'last-message.txt');
  fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');

  const codexBin = String(process.env.CODEX_BIN || 'codex').trim() || 'codex';
  const promptText = buildPrompt({ taskName, systemPrompt, userPrompt });
  try {
    await runCodexExec({
      codexBin,
      promptText,
      schemaPath,
      outputPath,
      model,
      traceEnabled,
    });
    if (!fs.existsSync(outputPath)) {
      throw new Error('Codex did not write an output-last-message file.');
    }
    const outputRaw = fs.readFileSync(outputPath, 'utf8');
    const parsed = extractJsonObject(outputRaw);
    process.stdout.write(JSON.stringify(parsed));
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {
      // Best-effort cleanup only.
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exit(1);
});
