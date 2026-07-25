export function resolveAgeInYearsFromBirthdate(birthdate, now = new Date()) {
  const date = new Date(`${birthdate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return NaN;
  }

  const current = new Date(now.getTime());
  let age = current.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = current.getUTCMonth() - date.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && current.getUTCDate() < date.getUTCDate())) {
    age -= 1;
  }

  return age;
}

export function resolveAgeInMonthsFromBirthdate(birthdate, now = new Date()) {
  const date = new Date(`${birthdate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return NaN;
  }

  const current = new Date(now.getTime());
  let months = (current.getUTCFullYear() - date.getUTCFullYear()) * 12
    + (current.getUTCMonth() - date.getUTCMonth());

  if (current.getUTCDate() < date.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}
