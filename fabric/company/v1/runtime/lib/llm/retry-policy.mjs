
export function shouldRetryReview(result, attempt, maxAttempts = 2) {
  if (!result) return attempt < maxAttempts;
  if (result.status === 'approved') return false;
  if (result.status === 'revise') return attempt < maxAttempts;
  if (result.status === 'failed') return attempt < maxAttempts;
  return false;
}

export function nextAttemptReason(result) {
  if (!result) return 'missing review result';
  return result.reason || 'artifact requires revision';
}
