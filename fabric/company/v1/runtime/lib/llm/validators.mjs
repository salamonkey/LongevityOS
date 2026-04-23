
export function validateBriefSections(markdown) {
  const required = [
    '## 1. Product Description',
    '## 3. Core Problem',
    '## 6. Core MVP Scope',
    '## 11. Explicit Out of Scope',
    '## 13. Primary Success Criteria'
  ];
  const missing = required.filter((h) => !markdown.includes(h));
  return { ok: missing.length === 0, missing };
}

export function findScopeLeakage(markdown) {
  const inScope = (markdown.match(/### 6\./g) || []).length;
  const outScope = (markdown.match(/Out of Scope|out of scope/g) || []).length;
  return { ok: inScope > 0 && outScope > 0, inScope, outScope };
}
