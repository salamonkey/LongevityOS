import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeSpecPath(rawValue) {
  return String(rawValue || '').trim().replace(/^['"]|['"]$/g, '');
}

function resolveRoleSpecPathFromRolesYaml({ fabricRoot, roleId }) {
  const rolesPath = path.join(fabricRoot, 'team/roles.yaml');
  if (!fs.existsSync(rolesPath)) return null;
  const text = readText(rolesPath);
  const blockMatch = text.match(new RegExp(`-\\s+id:\\s*${String(roleId)}\\b[\\s\\S]*?(?=\\n-\\s+id:|$)`));
  if (!blockMatch) return null;
  const specMatch = blockMatch[0].match(/^\s*spec_path:\s*(.+)\s*$/m);
  if (!specMatch) return null;
  return normalizeSpecPath(specMatch[1]);
}

export function resolveFabricRoot(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '../../..');
}

export function loadRoleContract({ fabricRoot, roleId, fallbackRelPath }) {
  const relPath = resolveRoleSpecPathFromRolesYaml({ fabricRoot, roleId }) || String(fallbackRelPath || '').trim();
  const absPath = path.join(fabricRoot, relPath);
  if (!relPath || !fs.existsSync(absPath)) {
    return { relPath: relPath || String(fallbackRelPath || '').trim(), roleContract: '' };
  }
  return {
    relPath,
    roleContract: readText(absPath).trim(),
  };
}

export function loadRoleContractForModule({ importMetaUrl, roleId, fallbackRelPath }) {
  const fabricRoot = resolveFabricRoot(importMetaUrl);
  return loadRoleContract({ fabricRoot, roleId, fallbackRelPath });
}
