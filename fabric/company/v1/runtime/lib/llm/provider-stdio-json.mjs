
import { spawn } from 'node:child_process';

function splitArgs(raw) {
  if (!raw) return [];
  return String(raw).match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^['"]|['"]$/g, '')) || [];
}

export async function invokeStdioJsonStructured({
  settings,
  taskName,
  systemPrompt,
  userPrompt,
  schema,
  signal,
}) {
  const args = Array.isArray(settings.stdioArgs) ? settings.stdioArgs : splitArgs(settings.stdioArgs);
  return new Promise((resolve, reject) => {
    const child = spawn(String(settings.stdioCommand), args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let settled = false;
    let stdout = '';
    let stderr = '';
    const finish = (fn) => (value) => {
      if (settled) {
        return;
      }
      settled = true;
      fn(value);
    };
    const resolveOnce = finish(resolve);
    const rejectOnce = finish(reject);
    let abortListener = null;

    if (signal) {
      if (signal.aborted) {
        try {
          child.kill('SIGKILL');
        } catch (_) {
          // Ignore kill errors.
        }
        rejectOnce(new Error('stdio_json provider aborted'));
        return;
      }
      abortListener = () => {
        try {
          child.kill('SIGKILL');
        } catch (_) {
          // Ignore kill errors.
        }
        rejectOnce(new Error('stdio_json provider aborted'));
      };
      signal.addEventListener('abort', abortListener, { once: true });
    }

    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', rejectOnce);
    child.on('close', (code) => {
      if (abortListener && signal) {
        signal.removeEventListener('abort', abortListener);
      }
      if (settled) {
        return;
      }
      if (code !== 0) {
        rejectOnce(new Error(`stdio_json provider exited with code ${String(code)}: ${stderr.trim() || 'no stderr'}`));
        return;
      }
      try {
        resolveOnce(JSON.parse(stdout));
      } catch (error) {
        rejectOnce(new Error(`stdio_json provider returned invalid JSON: ${String(error?.message || error)}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
      }
    });
    child.stdin.write(JSON.stringify({ taskName, systemPrompt, userPrompt, schema, settings: { model: settings.model, reasoningEffort: settings.reasoningEffort, verbosity: settings.verbosity } }));
    child.stdin.end();
  });
}
