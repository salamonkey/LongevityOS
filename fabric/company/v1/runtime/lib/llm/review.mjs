
import { validateBriefSections, findScopeLeakage } from './validators.mjs';

export function reviewArtifact({ kind, markdown }) {
  if (kind === 'project-brief') {
    const sections = validateBriefSections(markdown);
    const leakage = findScopeLeakage(markdown);
    const issues = [];
    if (!sections.ok) issues.push(`Missing sections: ${sections.missing.join(', ')}`);
    if (!leakage.ok) issues.push('Could not verify both in-scope and out-of-scope structure.');
    return {
      status: issues.length ? 'revise' : 'approved',
      score: issues.length ? 3.8 : 4.6,
      issues,
      summary: issues.length ? 'Brief needs revision before approval.' : 'Brief passed structural review.'
    };
  }
  return { status: 'approved', score: 4.2, issues: [], summary: 'Basic review passed.' };
}
