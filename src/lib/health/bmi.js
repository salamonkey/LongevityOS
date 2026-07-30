// Pure BMI math, shared between the plan-generation rule engine (plan.js,
// which gates flu/COVID booster eligibility on severe obesity) and the
// dashboard projection (which just displays the number).

export const BMI_CATEGORIES = Object.freeze({
  underweight: 'underweight',
  normal: 'normal',
  overweight: 'overweight',
  obese: 'obese',
});

// The exact threshold the BAG Impfplan itself uses to define its severe-
// obesity risk group (source_ref Kapitel 3.1e/Tabelle 5, Kapitel 3.1k) --
// keep this in sync with the 'obesity_bmi35plus' risk flag in the catalog.
export const SEVERE_OBESITY_BMI_THRESHOLD = 35;

export function calculateBmi(heightCm, weightKg) {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0) {
    return null;
  }

  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function resolveBmiCategory(bmi) {
  if (!Number.isFinite(bmi)) {
    return null;
  }
  if (bmi < 18.5) return BMI_CATEGORIES.underweight;
  if (bmi < 25) return BMI_CATEGORIES.normal;
  if (bmi < 30) return BMI_CATEGORIES.overweight;
  return BMI_CATEGORIES.obese;
}

export function isSeverelyObeseBmi(bmi) {
  return Number.isFinite(bmi) && bmi >= SEVERE_OBESITY_BMI_THRESHOLD;
}
