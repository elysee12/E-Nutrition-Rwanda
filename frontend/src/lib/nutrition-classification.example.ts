/**
 * E-Nutrition Rwanda - Malnutrition Classification Examples
 * 
 * This file demonstrates how to use the nutrition classification system
 * with real-world examples based on WHO standards.
 */

import { classifyMalnutrition, type ChildMeasurements } from "./nutrition-classification";

// Example 1: Severe Acute Malnutrition (SAM)
// Child with very low MUAC and weight-for-height
const samExample: ChildMeasurements = {
  weight: 7.0,        // kg - very low for height
  height: 75.0,       // cm
  muac: 11.0,         // cm - below 11.5 cm threshold (SAM)
  sex: "M",
  ageMonths: 18,
};

console.log("=== SAM Example ===");
console.log("Input:", samExample);
const samResult = classifyMalnutrition(samExample);
console.log("Result:", samResult.status);
console.log("MUAC Status:", samResult.indicators.muacStatus);
console.log("Recommendations:", samResult.recommendations);

// Example 2: Moderate Acute Malnutrition (MAM)
const mamExample: ChildMeasurements = {
  weight: 7.2,
  height: 71.0,
  muac: 11.8,         // 11.5-12.4 cm range (MAM)
  sex: "F",
  ageMonths: 14,
};

console.log("\n=== MAM Example ===");
console.log("Input:", mamExample);
const mamResult = classifyMalnutrition(mamExample);
console.log("Result:", mamResult.status);
console.log("MUAC Status:", mamResult.indicators.muacStatus);

// Example 3: Stunting (chronic malnutrition)
const stuntingExample: ChildMeasurements = {
  weight: 11.1,
  height: 86.0,       // Low for age
  muac: 12.8,         // cm - normal
  sex: "M",
  ageMonths: 36,      // 3 years old but short
};

console.log("\n=== Stunting Example ===");
console.log("Input:", stuntingExample);
const stuntingResult = classifyMalnutrition(stuntingExample);
console.log("Result:", stuntingResult.status);
console.log("Height-for-Age:", stuntingResult.indicators.heightForAge);
console.log("Z-Score (HAZ):", stuntingResult.zScores.hfa);

// Example 4: Normal/Healthy Child
const normalExample: ChildMeasurements = {
  weight: 7.6,
  height: 68.0,
  muac: 13.4,         // cm - normal
  sex: "F",
  ageMonths: 9,
};

console.log("\n=== Normal Example ===");
console.log("Input:", normalExample);
const normalResult = classifyMalnutrition(normalExample);
console.log("Result:", normalResult.status);
console.log("All indicators:", normalResult.indicators);

// Example 5: Underweight
const underweightExample: ChildMeasurements = {
  weight: 8.4,
  height: 76.0,
  muac: 12.1,         // cm - normal
  sex: "F",
  ageMonths: 22,
};

console.log("\n=== Underweight Example ===");
console.log("Input:", underweightExample);
const underweightResult = classifyMalnutrition(underweightExample);
console.log("Result:", underweightResult.status);
console.log("Weight-for-Age:", underweightResult.indicators.weightForAge);

// Example 6: Wasting (acute malnutrition)
const wastingExample: ChildMeasurements = {
  weight: 6.9,
  height: 67.0,
  muac: 11.3,         // cm - below 11.5 (SAM)
  sex: "M",
  ageMonths: 11,
};

console.log("\n=== Wasting Example ===");
console.log("Input:", wastingExample);
const wastingResult = classifyMalnutrition(wastingExample);
console.log("Result:", wastingResult.status);
console.log("Weight-for-Height:", wastingResult.indicators.weightForHeight);
console.log("Z-Score (WHZ):", wastingResult.zScores.wfh);

/**
 * Key Thresholds (WHO Standards):
 * 
 * MUAC (children 6-59 months) - NOW IN CENTIMETERS:
 * - SAM: < 11.5 cm (was < 115 mm)
 * - MAM: 11.5-12.4 cm (was 115-124 mm)
 * - Normal: ≥ 12.5 cm (was ≥ 125 mm)
 * 
 * Z-Scores (Weight-for-Height, Height-for-Age, Weight-for-Age):
 * - Severe: < -3 SD
 * - Moderate: -3 to -2 SD
 * - Normal: ≥ -2 SD
 * 
 * Classification Priority:
 * 1. SAM (most severe - immediate action)
 * 2. MAM (moderate - intervention needed)
 * 3. Wasting (acute malnutrition)
 * 4. Stunting (chronic malnutrition)
 * 5. Underweight
 * 6. Normal
 */
