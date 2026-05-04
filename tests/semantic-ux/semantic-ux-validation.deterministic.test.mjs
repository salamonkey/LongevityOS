import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildSemanticUxContract,
  deterministicSemanticScan,
} from '../../fabric/company/v1/runtime/product/semantic-ux-validation.mjs';

function runScanWithSource(sourceText) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-ux-scan-'));
  try {
    const srcDir = path.join(tmpRoot, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'App.jsx'), String(sourceText), 'utf8');
    const contract = buildSemanticUxContract({
      slice: { id: 'SL-TEST', title: 'Test Slice', objective: 'Scanner precision test' },
      uxFlowText: '',
    });
    return deterministicSemanticScan({ targetRoot: tmpRoot, contract });
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

test('deterministic scan does not flag useState(null)', () => {
  const findings = runScanWithSource(`
    import { useState } from 'react';
    export function App() {
      const [value, setValue] = useState(null);
      return <main><h1>Health item details</h1></main>;
    }
  `);
  assert.equal(findings.length, 0);
});

test('deterministic scan does not flag return null', () => {
  const findings = runScanWithSource(`
    export function App({ ready }) {
      if (!ready) return null;
      return <div>Ready</div>;
    }
  `);
  assert.equal(findings.length, 0);
});

test('deterministic scan does not flag Number.isNaN', () => {
  const findings = runScanWithSource(`
    export function App({ value }) {
      const invalid = Number.isNaN(value);
      return <p>{invalid ? 'Not available' : 'Available'}</p>;
    }
  `);
  assert.equal(findings.length, 0);
});

test('deterministic scan flags visible undefined text', () => {
  const findings = runScanWithSource(`
    export function App() {
      return <p>Status: undefined</p>;
    }
  `);
  assert.equal(findings.some((item) =>
    item.issue_type === 'forbidden_visible_fragment'
    && item.severity === 'blocker'
    && item.visibility === 'likely_visible'
    && item.confidence === 'high'
  ), true);
});

test('deterministic scan flags visible this slice copy', () => {
  const findings = runScanWithSource(`
    export function App() {
      return <p>This slice is now complete.</p>;
    }
  `);
  assert.equal(findings.some((item) =>
    item.issue_type === 'internal_factory_language_in_visible_copy'
    && item.severity === 'blocker'
    && item.visibility === 'likely_visible'
    && item.confidence === 'high'
  ), true);
});

test('deterministic scan flags malformed visible date year', () => {
  const findings = runScanWithSource(`
    export function App() {
      return <p>Due on May 2, 20262</p>;
    }
  `);
  assert.equal(findings.some((item) =>
    item.issue_type === 'malformed_numeric_or_date_state'
    && item.severity === 'blocker'
    && item.visibility === 'likely_visible'
    && item.confidence === 'high'
  ), true);
});
