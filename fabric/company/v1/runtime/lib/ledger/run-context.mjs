import crypto from 'node:crypto';
import process from 'node:process';

function createRunId() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = crypto.randomBytes(4).toString('hex');
  return `run-${timestamp}-${suffix}`;
}

function createRunContext({ command = '', targetRoot = '', valuesPath = '', argv = [] } = {}) {
  const runId = process.env.FABRIC_RUN_ID || createRunId();
  process.env.FABRIC_RUN_ID = runId;

  return Object.freeze({
    run_id: runId,
    command: String(command || ''),
    target_root: String(targetRoot || ''),
    values_path: String(valuesPath || ''),
    argv: Array.isArray(argv) ? argv.map(String) : [],
    started_at_utc: new Date().toISOString(),
  });
}

export {
  createRunContext,
};
