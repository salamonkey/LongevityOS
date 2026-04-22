import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const FABRIC_ROOT = path.resolve(__dirname, '../..');
export const MANIFEST_PATH_JSON = path.join(FABRIC_ROOT, 'fabric.json');
export const MANIFEST_PATH_YAML = path.join(FABRIC_ROOT, 'fabric.yaml');

export const SLICE_LIST_FIELDS = new Set([
  'in_scope',
  'out_of_scope',
  'acceptance_criteria',
  'dependencies',
  'done_definition',
]);

export const KNOWN_PLACEHOLDER_PATTERNS = [
  { label: 'Slice Title', pattern: /\bSlice Title\b/g },
  { label: 'SL-XXX', pattern: /\bSL-XXX\b/g },
  { label: 'YYYY-MM-DD', pattern: /\bYYYY-MM-DD\b/g },
  { label: '<finding 1>', pattern: /<finding 1>/gi },
  { label: '<action 1>', pattern: /<action 1>/gi },
  { label: '__REQUIRED_', pattern: /__REQUIRED_[A-Z0-9_]+__/g },
];
