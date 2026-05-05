export const MVP_CATALOG_VERSION = 'sl001-mvp-v1';

export const MVP_PREVENTIVE_CATALOG = Object.freeze([
  {
    itemId: 'annual-wellness-visit',
    name: 'Annual wellness visit',
    category: 'checkup',
    cadenceLabel: 'Every year',
    whyItMatters: 'Regular checkups help catch changes early and keep your prevention plan current.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 1 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'blood-pressure-check',
    name: 'Blood pressure check',
    category: 'checkup',
    cadenceLabel: 'At least every year',
    whyItMatters: 'Blood pressure checks can identify heart risk factors before symptoms appear.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 2 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'cholesterol-screening',
    name: 'Cholesterol screening',
    category: 'checkup',
    cadenceLabel: 'Every 4 to 6 years',
    whyItMatters: 'This screening helps track cardiovascular risk and guide timely prevention.',
    ruleBands: [
      { gender: 'female', minAge: 20, maxAge: 120, targetAge: 20, dashboardBucket: 'soon', priorityOrder: 1 },
      { gender: 'male', minAge: 20, maxAge: 120, targetAge: 20, dashboardBucket: 'soon', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'diabetes-screening',
    name: 'Diabetes screening',
    category: 'checkup',
    cadenceLabel: 'Every 3 years',
    whyItMatters: 'Screening can catch blood sugar changes early and support prevention decisions.',
    ruleBands: [
      { gender: 'female', minAge: 35, maxAge: 120, targetAge: 35, dashboardBucket: 'soon', priorityOrder: 2 },
      { gender: 'male', minAge: 35, maxAge: 120, targetAge: 35, dashboardBucket: 'soon', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'cervical-cancer-screening',
    name: 'Cervical cancer screening',
    category: 'checkup',
    cadenceLabel: 'Every 3 to 5 years',
    whyItMatters: 'Routine screening can detect cell changes early and support effective follow-up.',
    ruleBands: [
      { gender: 'female', minAge: 25, maxAge: 65, targetAge: 25, dashboardBucket: 'later', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'prostate-health-discussion',
    name: 'Prostate health discussion',
    category: 'checkup',
    cadenceLabel: 'Discuss around age 50',
    whyItMatters: 'A timely discussion helps you decide with your clinician which screening path fits you.',
    ruleBands: [
      { gender: 'male', minAge: 45, maxAge: 120, targetAge: 50, dashboardBucket: 'later', priorityOrder: 1 },
    ],
  },
  {
    itemId: 'influenza-vaccine',
    name: 'Flu vaccine',
    category: 'vaccination',
    cadenceLabel: 'Every year',
    whyItMatters: 'Yearly vaccination lowers the risk of severe seasonal illness.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 3 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'today', priorityOrder: 3 },
    ],
  },
  {
    itemId: 'tdap-booster',
    name: 'Tetanus, diphtheria, and pertussis booster',
    category: 'vaccination',
    cadenceLabel: 'Every 10 years',
    whyItMatters: 'Boosters help maintain protection against serious bacterial infections.',
    ruleBands: [
      { gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'later', priorityOrder: 2 },
      { gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, dashboardBucket: 'later', priorityOrder: 2 },
    ],
  },
  {
    itemId: 'shingles-vaccine',
    name: 'Shingles vaccine',
    category: 'vaccination',
    cadenceLabel: '2-dose series after age 50',
    whyItMatters: 'Vaccination reduces the chance of shingles and long-lasting nerve pain.',
    ruleBands: [
      { gender: 'female', minAge: 50, maxAge: 120, targetAge: 50, dashboardBucket: 'soon', priorityOrder: 3 },
      { gender: 'male', minAge: 50, maxAge: 120, targetAge: 50, dashboardBucket: 'soon', priorityOrder: 3 },
    ],
  },
]);
