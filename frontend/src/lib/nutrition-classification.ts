/**
 * E-Nutrition Rwanda - Malnutrition Classification System
 * Based on WHO Child Growth Standards (2006)
 * 
 * This module classifies children under 5 years (0-59 months) into:
 * - SAM (Severe Acute Malnutrition)
 * - MAM (Moderate Acute Malnutrition)
 * - Stunting (chronic malnutrition)
 * - Underweight
 * - Wasting (acute malnutrition)
 * - Normal
 */

export type NutritionStatus = "Normal" | "MAM" | "SAM" | "Stunting" | "Underweight" | "Wasting";

export interface ChildMeasurements {
  weight: number;      // in kg
  height: number;      // in cm
  muac?: number;        // in cm (WHO standard)
  sex: 'M' | 'F';
  ageMonths: number;   // age in months (0-59)
}

export interface ClassificationResult {
  status: NutritionStatus;
  categories: {
    sam: boolean;
    mam: boolean;
    stunting: boolean;
    underweight: boolean;
    wasting: boolean;
  };
  indicators: {
    muacStatus: "Normal" | "MAM" | "SAM";
    weightForHeight: "Normal" | "Wasting" | "Severe Wasting";
    heightForAge: "Normal" | "Stunting" | "Severe Stunting";
    weightForAge: "Normal" | "Underweight" | "Severe Underweight";
  };
  zScores: {
    wfh?: number;  // Weight-for-Height z-score
    hfa?: number;  // Height-for-Age z-score
    wfa?: number;  // Weight-for-Age z-score
  };
  recommendations: string[];
}

/**
 * MUAC Classification (simple and field-friendly)
 * WHO standards for children 6-59 months
 * Values in centimeters:
 * - SAM: < 11.5 cm
 * - MAM: 11.5 - 12.4 cm
 * - Normal: >= 12.5 cm
 */
function classifyMUAC(muacCm: number, ageMonths: number): "Normal" | "MAM" | "SAM" {
  // MUAC is most reliable for children 6-59 months
  if (ageMonths < 6) {
    return "Normal"; // MUAC not applicable for infants < 6 months
  }
  
  if (muacCm < 11.5) {
    return "SAM";
  } else if (muacCm >= 11.5 && muacCm < 12.5) {
    return "MAM";
  }
  return "Normal";
}

/**
 * Calculate Weight-for-Height Z-score (WHZ)
 * Simplified calculation using WHO reference medians
 */
function calculateWeightForHeightZScore(
  weight: number,
  height: number,
  sex: "M" | "F"
): number {
  // WHO median reference values for weight-for-height
  // Simplified lookup table (real implementation would use full WHO tables)
  const whoMedians: Record<string, { median: number; sd: number }> = {
    // Format: "sex-height" -> { median weight, standard deviation }
    "M-65": { median: 7.1, sd: 0.8 },
    "M-70": { median: 8.3, sd: 0.9 },
    "M-75": { median: 9.4, sd: 1.0 },
    "M-80": { median: 10.4, sd: 1.1 },
    "M-85": { median: 11.4, sd: 1.2 },
    "M-90": { median: 12.3, sd: 1.3 },
    "F-65": { median: 6.7, sd: 0.8 },
    "F-70": { median: 7.8, sd: 0.9 },
    "F-75": { median: 8.8, sd: 1.0 },
    "F-80": { median: 9.8, sd: 1.1 },
    "F-85": { median: 10.7, sd: 1.2 },
    "F-90": { median: 11.5, sd: 1.3 },
  };

  // Round height to nearest 5cm for lookup
  const roundedHeight = Math.round(height / 5) * 5;
  const key = `${sex}-${roundedHeight}`;
  const reference = whoMedians[key];

  if (!reference) {
    // Height out of range, use interpolation or return 0
    return 0;
  }

  // Z-score formula: (observed - median) / SD
  const zScore = (weight - reference.median) / reference.sd;
  return Math.round(zScore * 100) / 100;
}

/**
 * Calculate Height-for-Age Z-score (HAZ)
 */
function calculateHeightForAgeZScore(
  height: number,
  ageMonths: number,
  sex: "M" | "F"
): number {
  // WHO median reference values for height-for-age
  const whoMedians: Record<string, { median: number; sd: number }> = {
    // Format: "sex-age" -> { median height, standard deviation }
    "M-6": { median: 67.6, sd: 2.5 },
    "M-9": { median: 72.0, sd: 2.5 },
    "M-12": { median: 75.7, sd: 2.5 },
    "M-18": { median: 82.3, sd: 2.9 },
    "M-24": { median: 87.1, sd: 3.1 },
    "M-30": { median: 91.4, sd: 3.3 },
    "M-36": { median: 95.1, sd: 3.4 },
    "M-42": { median: 98.6, sd: 3.5 },
    "M-48": { median: 101.9, sd: 3.6 },
    "M-54": { median: 105.0, sd: 3.7 },
    "F-6": { median: 65.7, sd: 2.4 },
    "F-9": { median: 70.1, sd: 2.5 },
    "F-12": { median: 74.0, sd: 2.5 },
    "F-18": { median: 80.7, sd: 2.8 },
    "F-24": { median: 85.7, sd: 3.0 },
    "F-30": { median: 90.1, sd: 3.2 },
    "F-36": { median: 93.9, sd: 3.4 },
    "F-42": { median: 97.4, sd: 3.5 },
    "F-48": { median: 100.7, sd: 3.6 },
    "F-54": { median: 103.9, sd: 3.7 },
  };

  // Round age to nearest 6 months for lookup
  const roundedAge = Math.round(ageMonths / 6) * 6;
  const key = `${sex}-${roundedAge}`;
  const reference = whoMedians[key];

  if (!reference) {
    return 0;
  }

  const zScore = (height - reference.median) / reference.sd;
  return Math.round(zScore * 100) / 100;
}

/**
 * Calculate Weight-for-Age Z-score (WAZ)
 */
function calculateWeightForAgeZScore(
  weight: number,
  ageMonths: number,
  sex: "M" | "F"
): number {
  // WHO median reference values for weight-for-age
  const whoMedians: Record<string, { median: number; sd: number }> = {
    "M-6": { median: 7.9, sd: 0.9 },
    "M-9": { median: 8.9, sd: 1.0 },
    "M-12": { median: 9.6, sd: 1.1 },
    "M-18": { median: 10.9, sd: 1.2 },
    "M-24": { median: 12.2, sd: 1.3 },
    "M-30": { median: 13.3, sd: 1.5 },
    "M-36": { median: 14.3, sd: 1.6 },
    "M-42": { median: 15.2, sd: 1.7 },
    "M-48": { median: 16.2, sd: 1.8 },
    "M-54": { median: 17.1, sd: 1.9 },
    "F-6": { median: 7.3, sd: 0.9 },
    "F-9": { median: 8.2, sd: 1.0 },
    "F-12": { median: 8.9, sd: 1.1 },
    "F-18": { median: 10.2, sd: 1.2 },
    "F-24": { median: 11.5, sd: 1.4 },
    "F-30": { median: 12.7, sd: 1.5 },
    "F-36": { median: 13.9, sd: 1.6 },
    "F-42": { median: 15.0, sd: 1.7 },
    "F-48": { median: 16.1, sd: 1.8 },
    "F-54": { median: 17.2, sd: 2.0 },
  };

  const roundedAge = Math.round(ageMonths / 6) * 6;
  const key = `${sex}-${roundedAge}`;
  const reference = whoMedians[key];

  if (!reference) {
    return 0;
  }

  const zScore = (weight - reference.median) / reference.sd;
  return Math.round(zScore * 100) / 100;
}

/**
 * Main classification function
 * Returns comprehensive malnutrition assessment
 */
export function classifyMalnutrition(
  measurements: ChildMeasurements
): ClassificationResult {
  const { weight, height, muac, sex, ageMonths } = measurements;

  // Validate inputs
  if (ageMonths < 0 || ageMonths > 59) {
    throw new Error("Age must be between 0-59 months");
  }
  if (weight <= 0 || height <= 0) {
    throw new Error("Invalid measurements: weight and height must be positive");
  }
  // MUAC is only required for children 6 months and older
  if (ageMonths >= 6 && (!muac || muac <= 0)) {
    throw new Error("Invalid measurements: MUAC must be positive for children 6 months and older");
  }
  
  // Use 0 for muac if not provided (for children <6 months)
  const muacForClassification = ageMonths >= 6 ? (muac as number) : 0;

  // Calculate MUAC classification
  const muacStatus = classifyMUAC(muacForClassification, ageMonths);

  // Calculate Z-scores
  const whz = calculateWeightForHeightZScore(weight, height, sex);
  const haz = calculateHeightForAgeZScore(height, ageMonths, sex);
  const waz = calculateWeightForAgeZScore(weight, ageMonths, sex);

  // Classify based on z-scores
  // Weight-for-Height (Wasting indicator)
  let weightForHeight: "Normal" | "Wasting" | "Severe Wasting" = "Normal";
  if (whz < -3) {
    weightForHeight = "Severe Wasting";
  } else if (whz < -2) {
    weightForHeight = "Wasting";
  }

  // Height-for-Age (Stunting indicator)
  let heightForAge: "Normal" | "Stunting" | "Severe Stunting" = "Normal";
  if (haz < -3) {
    heightForAge = "Severe Stunting";
  } else if (haz < -2) {
    heightForAge = "Stunting";
  }

  // Weight-for-Age (Underweight indicator)
  let weightForAge: "Normal" | "Underweight" | "Severe Underweight" = "Normal";
  if (waz < -3) {
    weightForAge = "Severe Underweight";
  } else if (waz < -2) {
    weightForAge = "Underweight";
  }

  // Determine primary classification flags
  const categories = {
    sam: muacStatus === "SAM" || weightForHeight === "Severe Wasting",
    mam: muacStatus === "MAM" || weightForHeight === "Wasting",
    stunting: heightForAge === "Stunting" || heightForAge === "Severe Stunting",
    underweight: weightForAge === "Underweight" || weightForAge === "Severe Underweight",
    wasting: weightForHeight === "Wasting" || weightForHeight === "Severe Wasting",
  };

  // Determine overall status (prioritize by severity)
  let status: NutritionStatus = "Normal";
  if (categories.sam) {
    status = "SAM";
  } else if (categories.mam) {
    status = "MAM";
  } else if (categories.wasting) {
    status = "Wasting";
  } else if (categories.stunting) {
    status = "Stunting";
  } else if (categories.underweight) {
    status = "Underweight";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (categories.sam) {
    recommendations.push("URGENT: Immediate referral to therapeutic feeding program required");
    recommendations.push("Admit to inpatient care or CMAM program");
    recommendations.push("Provide Ready-to-Use Therapeutic Food (RUTF)");
    recommendations.push("Screen for medical complications");
  } else if (categories.mam) {
    recommendations.push("Enroll in supplementary feeding program");
    recommendations.push("Provide fortified blended food supplements");
    recommendations.push("Weekly follow-up required");
    recommendations.push("Caregiver nutrition counseling");
  }
  
  if (categories.stunting) {
    recommendations.push("Long-term nutrition intervention needed");
    recommendations.push("Dietary diversity counseling for caregiver");
    recommendations.push("Monitor growth monthly");
  }
  
  if (categories.underweight) {
    recommendations.push("Assess feeding practices");
    recommendations.push("Check for underlying illness");
    recommendations.push("Bi-weekly monitoring");
  }

  if (status === "Normal") {
    recommendations.push("Continue routine growth monitoring");
    recommendations.push("Maintain healthy feeding practices");
    recommendations.push("Next visit in 1 month");
  }

  return {
    status,
    categories,
    indicators: {
      muacStatus,
      weightForHeight,
      heightForAge,
      weightForAge,
    },
    zScores: {
      wfh: whz,
      hfa: haz,
      wfa: waz,
    },
    recommendations,
  };
}

/**
 * Quick check for critical malnutrition (SAM)
 */
export function isCritical(measurements: ChildMeasurements): boolean {
  const result = classifyMalnutrition(measurements);
  return result.categories.sam;
}

/**
 * Get WHO Weight-for-Age percentiles (simplified) for 0-59 months
 */
export function getWHOWeightForAgePercentiles(
  ageMonths: number,
  sex: "M" | "F"
): { p3: number; p50: number; p97: number } {
  // Simplified WHO reference values for weight-for-age (kg)
  // Data from WHO Child Growth Standards (2006)
  const whoPercentiles: Record<string, { p3: number; p50: number; p97: number }> = {
    // Boys
    "M-0": { p3: 2.5, p50: 3.3, p97: 4.3 },
    "M-1": { p3: 3.4, p50: 4.5, p97: 5.8 },
    "M-2": { p3: 4.4, p50: 5.6, p97: 7.1 },
    "M-3": { p3: 5.1, p50: 6.4, p97: 8.0 },
    "M-4": { p3: 5.6, p50: 7.0, p97: 8.7 },
    "M-5": { p3: 6.0, p50: 7.5, p97: 9.3 },
    "M-6": { p3: 6.4, p50: 7.9, p97: 9.8 },
    "M-7": { p3: 6.7, p50: 8.3, p97: 10.2 },
    "M-8": { p3: 7.0, p50: 8.6, p97: 10.6 },
    "M-9": { p3: 7.2, p50: 8.9, p97: 10.9 },
    "M-10": { p3: 7.5, p50: 9.2, p97: 11.2 },
    "M-11": { p3: 7.7, p50: 9.4, p97: 11.5 },
    "M-12": { p3: 7.8, p50: 9.6, p97: 11.8 },
    "M-15": { p3: 8.3, p50: 10.2, p97: 12.5 },
    "M-18": { p3: 8.8, p50: 10.8, p97: 13.3 },
    "M-21": { p3: 9.2, p50: 11.3, p97: 13.9 },
    "M-24": { p3: 9.6, p50: 11.8, p97: 14.5 },
    "M-30": { p3: 10.4, p50: 12.9, p97: 15.9 },
    "M-36": { p3: 11.1, p50: 13.8, p97: 17.0 },
    "M-42": { p3: 11.8, p50: 14.6, p97: 18.1 },
    "M-48": { p3: 12.4, p50: 15.4, p97: 19.1 },
    "M-54": { p3: 13.0, p50: 16.1, p97: 20.0 },
    // Girls
    "F-0": { p3: 2.4, p50: 3.2, p97: 4.2 },
    "F-1": { p3: 3.2, p50: 4.2, p97: 5.5 },
    "F-2": { p3: 4.0, p50: 5.1, p97: 6.6 },
    "F-3": { p3: 4.7, p50: 5.8, p97: 7.4 },
    "F-4": { p3: 5.2, p50: 6.4, p97: 8.1 },
    "F-5": { p3: 5.6, p50: 6.9, p97: 8.6 },
    "F-6": { p3: 5.8, p50: 7.3, p97: 9.1 },
    "F-7": { p3: 6.1, p50: 7.7, p97: 9.5 },
    "F-8": { p3: 6.3, p50: 8.0, p97: 9.9 },
    "F-9": { p3: 6.6, p50: 8.2, p97: 10.2 },
    "F-10": { p3: 6.8, p50: 8.5, p97: 10.5 },
    "F-11": { p3: 7.0, p50: 8.7, p97: 10.8 },
    "F-12": { p3: 7.2, p50: 8.9, p97: 11.0 },
    "F-15": { p3: 7.6, p50: 9.5, p97: 11.7 },
    "F-18": { p3: 8.1, p50: 10.1, p97: 12.5 },
    "F-21": { p3: 8.6, p50: 10.7, p97: 13.2 },
    "F-24": { p3: 9.0, p50: 11.2, p97: 13.8 },
    "F-30": { p3: 9.8, p50: 12.3, p97: 15.2 },
    "F-36": { p3: 10.6, p50: 13.3, p97: 16.4 },
    "F-42": { p3: 11.2, p50: 14.1, p97: 17.5 },
    "F-48": { p3: 11.8, p50: 14.9, p97: 18.5 },
    "F-54": { p3: 12.4, p50: 15.6, p97: 19.5 },
  };

  // Find closest age
  const ageKeys = Object.keys(whoPercentiles)
    .filter(k => k.startsWith(sex))
    .map(k => parseInt(k.split("-")[1]))
    .sort((a, b) => a - b);
  
  let closestAge = ageKeys[0];
  let minDiff = Math.abs(ageMonths - closestAge);
  
  for (const age of ageKeys) {
    const diff = Math.abs(ageMonths - age);
    if (diff < minDiff) {
      minDiff = diff;
      closestAge = age;
    }
  }

  return whoPercentiles[`${sex}-${closestAge}`];
}

/**
 * Get color coding for status
 */
export function getStatusColor(status: NutritionStatus): string {
  switch (status) {
    case "SAM":
      return "text-red-700 bg-red-50 border-red-300";
    case "MAM":
      return "text-orange-700 bg-orange-50 border-orange-300";
    case "Wasting":
      return "text-amber-700 bg-amber-50 border-amber-300";
    case "Stunting":
      return "text-purple-700 bg-purple-50 border-purple-300";
    case "Underweight":
      return "text-yellow-700 bg-yellow-50 border-yellow-300";
    default:
      return "text-green-700 bg-green-50 border-green-300";
  }
}

/**
 * Get severity level
 */
export function getSeverityLevel(
  status: NutritionStatus
): "critical" | "moderate" | "mild" | "normal" {
  switch (status) {
    case "SAM":
      return "critical";
    case "MAM":
    case "Wasting":
      return "moderate";
    case "Stunting":
    case "Underweight":
      return "mild";
    default:
      return "normal";
  }
}
