export const TEST_CATALOG_VERSION = "sl001-mvp-v2-expanded-30";

export const TEST_PREVENTIVE_CATALOG = Object.freeze([
  {
    "itemId": "annual-wellness-visit",
    "name": "Annual wellness visit",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "Every year",
    "whyItMatters": "Regular checkups help catch changes early and keep your prevention plan current.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 1
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 1
      }
    ]
  },
  {
    "itemId": "blood-pressure-check",
    "name": "Blood pressure check",
    "category": "checkup",
    "effortLevel": "low",
    "cadenceLabel": "At least every year",
    "whyItMatters": "Blood pressure checks can identify heart risk factors before symptoms appear.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 2
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 2
      }
    ]
  },
  {
    "itemId": "cholesterol-screening",
    "name": "Cholesterol screening",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "Every 4 to 6 years",
    "whyItMatters": "This screening helps track cardiovascular risk and guide timely prevention.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 20,
        "maxAge": 120,
        "targetAge": 20,
        "priorityOrder": 1
      },
      {
        "gender": "male",
        "minAge": 20,
        "maxAge": 120,
        "targetAge": 20,
        "priorityOrder": 1
      }
    ]
  },
  {
    "itemId": "diabetes-screening",
    "name": "Diabetes screening",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "Every 3 years",
    "whyItMatters": "Screening can catch blood sugar changes early and support prevention decisions.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 35,
        "maxAge": 120,
        "targetAge": 35,
        "priorityOrder": 2
      },
      {
        "gender": "male",
        "minAge": 35,
        "maxAge": 120,
        "targetAge": 35,
        "priorityOrder": 2
      }
    ]
  },
  {
    "itemId": "cervical-cancer-screening",
    "name": "Cervical cancer screening",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "Every 3 to 5 years",
    "whyItMatters": "Routine screening can detect cell changes early and support effective follow-up.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 25,
        "maxAge": 65,
        "targetAge": 25,
        "priorityOrder": 1
      }
    ]
  },
  {
    "itemId": "prostate-health-discussion",
    "name": "Prostate health discussion",
    "category": "checkup",
    "effortLevel": "low",
    "cadenceLabel": "Discuss around age 50",
    "whyItMatters": "A timely discussion helps you decide with your clinician which screening path fits you.",
    "ruleBands": [
      {
        "gender": "male",
        "minAge": 45,
        "maxAge": 120,
        "targetAge": 50,
        "priorityOrder": 1
      }
    ]
  },
  {
    "itemId": "influenza-vaccine",
    "name": "Flu vaccine",
    "category": "vaccination",
    "effortLevel": "low",
    "cadenceLabel": "Every year",
    "whyItMatters": "Yearly vaccination lowers the risk of severe seasonal illness.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 3
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 3
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 3,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Every year",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 3,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Every year",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "tdap-booster",
    "name": "Tetanus, diphtheria, and pertussis booster",
    "category": "vaccination",
    "effortLevel": "low",
    "cadenceLabel": "Every 10 years",
    "whyItMatters": "Boosters help maintain protection against serious bacterial infections.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 2
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 2
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 2,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Every 10 years",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 2,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Every 10 years",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "shingles-vaccine",
    "name": "Shingles vaccine",
    "category": "vaccination",
    "effortLevel": "high",
    "cadenceLabel": "2-dose series after age 50",
    "whyItMatters": "Vaccination reduces the chance of shingles and long-lasting nerve pain.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 50,
        "maxAge": 120,
        "targetAge": 50,
        "priorityOrder": 3
      },
      {
        "gender": "male",
        "minAge": 50,
        "maxAge": 120,
        "targetAge": 50,
        "priorityOrder": 3
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 600,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 600,
        "priorityOrder": 3,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2-dose series after age 50",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 600,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 600,
        "priorityOrder": 3,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2-dose series after age 50",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "covid-19-booster",
    "name": "COVID-19 booster",
    "category": "vaccination",
    "effortLevel": "low",
    "cadenceLabel": "Seasonal booster guidance",
    "whyItMatters": "Boosters help reduce the risk of severe respiratory illness and hospitalization.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 4
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 4
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 4,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Seasonal booster guidance",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 4,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Seasonal booster guidance",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "hepatitis-b-vaccine",
    "name": "Hepatitis B vaccine",
    "category": "vaccination",
    "effortLevel": "high",
    "cadenceLabel": "Series based on risk and history",
    "whyItMatters": "Vaccination protects against hepatitis B infection and long-term liver complications.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 4
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 4
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 4,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Series based on risk and history",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 4,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Series based on risk and history",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "colorectal-cancer-screening",
    "name": "Colorectal cancer screening",
    "category": "checkup",
    "effortLevel": "high",
    "cadenceLabel": "Every year to every 10 years (method-dependent)",
    "whyItMatters": "Routine colorectal screening helps detect precancerous changes and cancer earlier.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 45,
        "maxAge": 75,
        "targetAge": 45,
        "priorityOrder": 1
      },
      {
        "gender": "male",
        "minAge": 45,
        "maxAge": 75,
        "targetAge": 45,
        "priorityOrder": 1
      }
    ]
  },
  {
    "itemId": "breast-cancer-screening",
    "name": "Breast cancer screening (mammogram)",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "Every 2 years",
    "whyItMatters": "Regular mammography can lower the risk of dying from breast cancer through earlier detection.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 40,
        "maxAge": 74,
        "targetAge": 40,
        "priorityOrder": 1
      }
    ]
  },
  {
    "itemId": "lung-cancer-screening",
    "name": "Lung cancer screening discussion",
    "category": "checkup",
    "effortLevel": "low",
    "cadenceLabel": "Every year when high-risk criteria are met",
    "whyItMatters": "For people at high risk, annual low-dose CT screening can detect lung cancer earlier.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 50,
        "maxAge": 80,
        "targetAge": 50,
        "priorityOrder": 2
      },
      {
        "gender": "male",
        "minAge": 50,
        "maxAge": 80,
        "targetAge": 50,
        "priorityOrder": 2
      }
    ]
  },
  {
    "itemId": "osteoporosis-screening",
    "name": "Osteoporosis screening",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "Around age 65, then per results",
    "whyItMatters": "Bone-density screening helps identify fracture risk early and supports prevention.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 65,
        "maxAge": 120,
        "targetAge": 65,
        "priorityOrder": 2
      }
    ]
  },
  {
    "itemId": "abdominal-aortic-aneurysm-screening",
    "name": "Abdominal aortic aneurysm screening discussion",
    "category": "checkup",
    "effortLevel": "low",
    "cadenceLabel": "One-time around age 65 to 75 if indicated",
    "whyItMatters": "A one-time ultrasound can detect aneurysms before rupture in eligible adults.",
    "ruleBands": [
      {
        "gender": "male",
        "minAge": 65,
        "maxAge": 75,
        "targetAge": 65,
        "priorityOrder": 3
      }
    ]
  },
  {
    "itemId": "depression-screening",
    "name": "Depression screening",
    "category": "checkup",
    "effortLevel": "low",
    "cadenceLabel": "Periodic screening",
    "whyItMatters": "Routine screening can identify depression earlier so treatment can start sooner.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 3
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 3
      }
    ]
  },
  {
    "itemId": "hiv-screening",
    "name": "HIV screening",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "At least once, then by risk",
    "whyItMatters": "HIV screening supports early diagnosis and treatment, improving health outcomes.",
    "requiredRiskFlags": [
      "hiv"
    ],
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 15,
        "maxAge": 65,
        "targetAge": 15,
        "priorityOrder": 4
      },
      {
        "gender": "male",
        "minAge": 15,
        "maxAge": 65,
        "targetAge": 15,
        "priorityOrder": 4
      }
    ]
  },
  {
    "itemId": "hepatitis-c-screening",
    "name": "Hepatitis C screening",
    "category": "checkup",
    "effortLevel": "medium",
    "cadenceLabel": "At least once for ages 18 to 79",
    "whyItMatters": "One-time hepatitis C screening can find silent infection and prevent long-term liver harm.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 79,
        "targetAge": 18,
        "priorityOrder": 4
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 79,
        "targetAge": 18,
        "priorityOrder": 4
      }
    ]
  },
  {
    "itemId": "tobacco-cessation-support",
    "name": "Tobacco use screening and quit support",
    "category": "checkup",
    "effortLevel": "low",
    "cadenceLabel": "At each routine visit",
    "whyItMatters": "Asking about tobacco use and offering support increases successful quitting.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 5
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 5
      }
    ]
  },
  {
    "itemId": "alcohol-use-screening",
    "name": "Alcohol use screening",
    "category": "checkup",
    "effortLevel": "low",
    "cadenceLabel": "Periodic screening",
    "whyItMatters": "Screening can identify risky alcohol use early and guide brief counseling.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 5
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 5
      }
    ]
  },
  {
    "itemId": "pneumococcal-vaccine",
    "name": "Pneumococcal vaccine",
    "category": "vaccination",
    "effortLevel": "medium",
    "cadenceLabel": "Adults 50+ or risk-based, per schedule",
    "whyItMatters": "Pneumococcal vaccination helps prevent serious pneumonia and bloodstream infections.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 50,
        "maxAge": 120,
        "targetAge": 50,
        "priorityOrder": 4
      },
      {
        "gender": "male",
        "minAge": 50,
        "maxAge": 120,
        "targetAge": 50,
        "priorityOrder": 4
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 600,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 600,
        "priorityOrder": 4,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Adults 50+ or risk-based, per schedule",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 600,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 600,
        "priorityOrder": 4,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Adults 50+ or risk-based, per schedule",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "rsv-vaccine",
    "name": "RSV vaccine discussion",
    "category": "vaccination",
    "effortLevel": "medium",
    "cadenceLabel": "Single-season dose by age/risk guidance",
    "whyItMatters": "RSV vaccination can reduce severe lower respiratory infection risk in older adults.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 60,
        "maxAge": 120,
        "targetAge": 60,
        "priorityOrder": 5
      },
      {
        "gender": "male",
        "minAge": 60,
        "maxAge": 120,
        "targetAge": 60,
        "priorityOrder": 5
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 720,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 720,
        "priorityOrder": 5,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Single-season dose by age/risk guidance",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 720,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 720,
        "priorityOrder": 5,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Single-season dose by age/risk guidance",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "hpv-vaccine",
    "name": "HPV vaccine",
    "category": "vaccination",
    "effortLevel": "high",
    "cadenceLabel": "2 to 3 dose series by age/history",
    "whyItMatters": "HPV vaccination lowers risk of several cancers and genital warts.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 45,
        "targetAge": 18,
        "priorityOrder": 5
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 45,
        "targetAge": 18,
        "priorityOrder": 5
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 540,
        "targetAgeMonths": 216,
        "priorityOrder": 5,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2 to 3 dose series by age/history",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 540,
        "targetAgeMonths": 216,
        "priorityOrder": 5,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2 to 3 dose series by age/history",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "mmr-vaccine",
    "name": "MMR vaccine",
    "category": "vaccination",
    "effortLevel": "medium",
    "cadenceLabel": "Catch-up doses if not immune",
    "whyItMatters": "MMR vaccination protects against measles, mumps, and rubella outbreaks.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Catch-up doses if not immune",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Catch-up doses if not immune",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "varicella-vaccine",
    "name": "Varicella vaccine",
    "category": "vaccination",
    "effortLevel": "high",
    "cadenceLabel": "2-dose series if not immune",
    "whyItMatters": "Varicella vaccination reduces risk of primary chickenpox infection and complications.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2-dose series if not immune",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2-dose series if not immune",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "hepatitis-a-vaccine",
    "name": "Hepatitis A vaccine",
    "category": "vaccination",
    "effortLevel": "high",
    "cadenceLabel": "2-dose series when indicated",
    "whyItMatters": "Hepatitis A vaccination helps prevent acute liver infection, especially in higher-risk settings.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2-dose series when indicated",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "2-dose series when indicated",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "meningococcal-vaccine",
    "name": "Meningococcal vaccine discussion",
    "category": "vaccination",
    "effortLevel": "medium",
    "cadenceLabel": "By risk factors and exposure",
    "whyItMatters": "Risk-based meningococcal vaccination protects against rapid, severe meningococcal disease.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "By risk factors and exposure",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "By risk factors and exposure",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  },
  {
    "itemId": "polio-vaccine",
    "name": "Polio vaccine catch-up",
    "category": "vaccination",
    "effortLevel": "high",
    "cadenceLabel": "Complete series if incomplete",
    "whyItMatters": "Polio catch-up vaccination can protect adults who were not fully immunized earlier in life.",
    "ruleBands": [
      {
        "gender": "female",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      },
      {
        "gender": "male",
        "minAge": 18,
        "maxAge": 120,
        "targetAge": 18,
        "priorityOrder": 6
      }
    ],
    "vaccineDoses": [
      {
        "gender": "female",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Complete series if incomplete",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      },
      {
        "gender": "male",
        "ageMinMonths": 216,
        "ageMaxMonths": 1440,
        "targetAgeMonths": 216,
        "priorityOrder": 6,
        "doseNumber": null,
        "dosesInSeries": null,
        "minIntervalFromPreviousDoseDays": null,
        "recurrenceIntervalDays": null,
        "cadenceLabel": "Complete series if incomplete",
        "populationType": "general",
        "requiredRiskFlags": [],
        "sourceRef": "test-fixture"
      }
    ]
  }
]);
