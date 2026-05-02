import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LEDGER_SCHEMA_VERSION = 'factory.execution-ledger.v1';
const DEFAULT_LEDGER_REL_PATH = '.system/factory/execution-ledger.jsonl';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function sanitizeError(error) {
  if (!error) return undefined;
  return {
    name: String(error.name || 'Error'),
    message: String(error.message || error).slice(0, 1000),
  };
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)]),
    );
  }
  return value;
}

function ledgerPathForTarget(targetRoot, ledgerRelPath = DEFAULT_LEDGER_REL_PATH) {
  return path.join(targetRoot, ledgerRelPath);
}

function writeLedgerEvent({ targetRoot, runContext = {}, event = {} }) {
  if (!targetRoot) return null;

  const outPath = ledgerPathForTarget(targetRoot);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const payload = stripUndefined({
    schema_version: LEDGER_SCHEMA_VERSION,
    timestamp_utc: new Date().toISOString(),
    event_id: `evt-${sha256(`${Date.now()}-${process.pid}-${Math.random()}`).slice(0, 16)}`,
    run_id: runContext.run_id,
    command: runContext.command,
    event_type: event.event_type,
    status: event.status,
    step: event.step,
    target_root: runContext.target_root,
    values_path: runContext.values_path,
    duration_ms: event.duration_ms,
    inputs: event.inputs,
    outputs: event.outputs,
    artifacts: event.artifacts,
    metadata: event.metadata,
    error: sanitizeError(event.error),
  });

  fs.appendFileSync(outPath, `${JSON.stringify(payload)}\n`, 'utf8');
  return outPath;
}

export {
  DEFAULT_LEDGER_REL_PATH,
  LEDGER_SCHEMA_VERSION,
  ledgerPathForTarget,
  writeLedgerEvent,
};
