
import { spawn } from 'node:child_process';

function splitArgs(raw) {
  if (!raw) return [];
  return String(raw).match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^['"]|['"]$/g, '')) || [];
}

export async function invokeStdioJsonStructured({ settings, taskName, systemPrompt, userPrompt, schema }) {
  const args = Array.isArray(settings.stdioArgs) ? settings.stdioArgs : splitArgs(settings.stdioArgs);
  return new Promise((resolve, reject) => {
    const child = spawn(String(settings.stdioCommand), args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`stdio_json provider exited with code ${String(code)}: ${stderr.trim() || 'no stderr'}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`stdio_json provider returned invalid JSON: ${String(error?.message || error)}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
      }
    });
    child.stdin.write(JSON.stringify({ taskName, systemPrompt, userPrompt, schema, settings: { model: settings.model, reasoningEffort: settings.reasoningEffort, verbosity: settings.verbosity } }));
    child.stdin.end();
  });
}
