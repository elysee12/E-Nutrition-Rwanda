import { Injectable } from '@nestjs/common';

export interface ChildMeasurements {
  weight: number;      // kg
  height: number;      // cm
  muac: number;        // cm (changed from mm to cm)
  sex: 'M' | 'F';
  ageMonths: number;
}

export interface ZScores {
  wfh?: number;  // Weight-for-Height
  hfa?: number;  // Height-for-Age
  wfa?: number;  // Weight-for-Age
}

export interface ClassificationResult {
  nutritionStatus: 'Normal' | 'MAM' | 'SAM' | 'Stunting' | 'Underweight' | 'Wasting';
  isSAM: boolean;
  isMAM: boolean;
  isStunted: boolean;
  isUnderweight: boolean;
  isWasted: boolean;
  zScores: ZScores;
  muacStatus: 'Normal' | 'MAM' | 'SAM';
  recommendations: string[];
}

@Injectable()
export class WHOClassificationService {
  /**
   * Main classification method - implements WHO Child Growth Standards
   */
  classifyMalnutrition(measurements: ChildMeasurements): ClassificationResult {
    const { weight, height, muac, sex, ageMonths } = measurements;

    // Validate inputs
    if (ageMonths < 0 || ageMonths > 59) {
      throw new Error('Age must be between 0-59 months');
    }
    if (weight <= 0 || height <= 0) {
      throw new Error('Invalid measurements: weight and height must be positive');
    }
    // MUAC is only required for children 6 months and older
    if (ageMonths >= 6 && muac <= 0) {
      throw new Error('Invalid measurements: MUAC must be positive for children 6 months and older');
    }

    // Calculate MUAC classification
    const muacStatus = this.classifyMUAC(muac, ageMonths);

    // Calculate Z-scores
    const zScores = this.calculateZScores(weight, height, ageMonths, sex);

    // Determine classification flags
    const isSAM = muacStatus === 'SAM' || (zScores.wfh !== undefined && zScores.wfh < -3);
    const isMAM = muacStatus === 'MAM' || (zScores.wfh !== undefined && zScores.wfh >= -3 && zScores.wfh < -2);
    const isWasted = zScores.wfh !== undefined && zScores.wfh < -2;
    const isStunted = zScores.hfa !== undefined && zScores.hfa < -2;
    const isUnderweight = zScores.wfa !== undefined && zScores.wfa < -2;

    // Determine primary status (priority order)
    let nutritionStatus: ClassificationResult['nutritionStatus'] = 'Normal';
    if (isSAM) {
      nutritionStatus = 'SAM';
    } else if (isMAM) {
      nutritionStatus = 'MAM';
    } else if (isWasted) {
      nutritionStatus = 'Wasting';
    } else if (isStunted) {
      nutritionStatus = 'Stunting';
    } else if (isUnderweight) {
      nutritionStatus = 'Underweight';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(nutritionStatus, isSAM, isMAM, isStunted, isUnderweight);

    return {
      nutritionStatus,
      isSAM,
      isMAM,
      isStunted,
      isUnderweight,
      isWasted,
      zScores,
      muacStatus,
      recommendations,
    };
  }

  /**
   * Classify MUAC (Mid-Upper Arm Circumference)
   * WHO standards for children 6-59 months
   * Values in centimeters:
   * - SAM: < 11.5 cm
   * - MAM: 11.5 - 12.4 cm
   * - Normal: >= 12.5 cm
   */
  private classifyMUAC(muacCm: number, ageMonths: number): 'Normal' | 'MAM' | 'SAM' {
    // MUAC is most reliable for children 6-59 months
    if (ageMonths < 6) {
      return 'Normal'; // MUAC not applicable for infants < 6 months
    }

    if (muacCm < 11.5) {
      return 'SAM';
    } else if (muacCm >= 11.5 && muacCm < 12.5) {
      return 'MAM';
    }
    return 'Normal';
  }

  /**
   * Calculate WHO Z-scores
   */
  private calculateZScores(weight: number, height: number, ageMonths: number, sex: 'M' | 'F'): ZScores {
    return {
      wfh: this.calculateWeightForHeightZScore(weight, height, sex),
      hfa: this.calculateHeightForAgeZScore(height, ageMonths, sex),
      wfa: this.calculateWeightForAgeZScore(weight, ageMonths, sex),
    };
  }

  /**
   * Weight-for-Height Z-score calculation
   */
  private calculateWeightForHeightZScore(weight: number, height: number, sex: 'M' | 'F'): number {
    const whoMedians: Record<string, { median: number; sd: number }> = {
      'M-65': { median: 7.1, sd: 0.8 },
      'M-70': { median: 8.3, sd: 0.9 },
      'M-75': { median: 9.4, sd: 1.0 },
      'M-80': { median: 10.4, sd: 1.1 },
      'M-85': { median: 11.4, sd: 1.2 },
      'M-90': { median: 12.3, sd: 1.3 },
      'M-95': { median: 13.1, sd: 1.4 },
      'M-100': { median: 13.9, sd: 1.5 },
      'M-105': { median: 14.7, sd: 1.6 },
      'M-110': { median: 15.5, sd: 1.7 },
      'F-65': { median: 6.7, sd: 0.8 },
      'F-70': { median: 7.8, sd: 0.9 },
      'F-75': { median: 8.8, sd: 1.0 },
      'F-80': { median: 9.8, sd: 1.1 },
      'F-85': { median: 10.7, sd: 1.2 },
      'F-90': { median: 11.5, sd: 1.3 },
      'F-95': { median: 12.3, sd: 1.4 },
      'F-100': { median: 13.0, sd: 1.5 },
      'F-105': { median: 13.7, sd: 1.6 },
      'F-110': { median: 14.4, sd: 1.7 },
    };

    const roundedHeight = Math.round(height / 5) * 5;
    const key = `${sex}-${roundedHeight}`;
    const reference = whoMedians[key];

    if (!reference) return 0;

    const zScore = (weight - reference.median) / reference.sd;
    return Math.round(zScore * 100) / 100;
  }

  /**
   * Height-for-Age Z-score calculation
   */
  private calculateHeightForAgeZScore(height: number, ageMonths: number, sex: 'M' | 'F'): number {
    const whoMedians: Record<string, { median: number; sd: number }> = {
      'M-6': { median: 67.6, sd: 2.5 },
      'M-12': { median: 75.7, sd: 2.5 },
      'M-18': { median: 82.3, sd: 2.9 },
      'M-24': { median: 87.1, sd: 3.1 },
      'M-30': { median: 91.4, sd: 3.3 },
      'M-36': { median: 95.1, sd: 3.4 },
      'M-42': { median: 98.6, sd: 3.5 },
      'M-48': { median: 101.9, sd: 3.6 },
      'M-54': { median: 105.0, sd: 3.7 },
      'F-6': { median: 65.7, sd: 2.4 },
      'F-12': { median: 74.0, sd: 2.5 },
      'F-18': { median: 80.7, sd: 2.8 },
      'F-24': { median: 85.7, sd: 3.0 },
      'F-30': { median: 90.1, sd: 3.2 },
      'F-36': { median: 93.9, sd: 3.4 },
      'F-42': { median: 97.4, sd: 3.5 },
      'F-48': { median: 100.7, sd: 3.6 },
      'F-54': { median: 103.9, sd: 3.7 },
    };

    const roundedAge = Math.round(ageMonths / 6) * 6;
    const key = `${sex}-${roundedAge}`;
    const reference = whoMedians[key];

    if (!reference) return 0;

    const zScore = (height - reference.median) / reference.sd;
    return Math.round(zScore * 100) / 100;
  }

  /**
   * Weight-for-Age Z-score calculation
   */
  private calculateWeightForAgeZScore(weight: number, ageMonths: number, sex: 'M' | 'F'): number {
    const whoMedians: Record<string, { median: number; sd: number }> = {
      'M-6': { median: 7.9, sd: 0.9 },
      'M-12': { median: 9.6, sd: 1.1 },
      'M-18': { median: 10.9, sd: 1.2 },
      'M-24': { median: 12.2, sd: 1.3 },
      'M-30': { median: 13.3, sd: 1.5 },
      'M-36': { median: 14.3, sd: 1.6 },
      'M-42': { median: 15.2, sd: 1.7 },
      'M-48': { median: 16.2, sd: 1.8 },
      'M-54': { median: 17.1, sd: 1.9 },
      'F-6': { median: 7.3, sd: 0.9 },
      'F-12': { median: 8.9, sd: 1.1 },
      'F-18': { median: 10.2, sd: 1.2 },
      'F-24': { median: 11.5, sd: 1.4 },
      'F-30': { median: 12.7, sd: 1.5 },
      'F-36': { median: 13.9, sd: 1.6 },
      'F-42': { median: 15.0, sd: 1.7 },
      'F-48': { median: 16.1, sd: 1.8 },
      'F-54': { median: 17.2, sd: 2.0 },
    };

    const roundedAge = Math.round(ageMonths / 6) * 6;
    const key = `${sex}-${roundedAge}`;
    const reference = whoMedians[key];

    if (!reference) return 0;

    const zScore = (weight - reference.median) / reference.sd;
    return Math.round(zScore * 100) / 100;
  }

  /**
   * Generate clinical recommendations based on status
   */
  private generateRecommendations(
    status: string,
    isSAM: boolean,
    isMAM: boolean,
    isStunted: boolean,
    isUnderweight: boolean,
  ): string[] {
    const recommendations: string[] = [];

    if (isSAM) {
      recommendations.push('URGENT: Immediate referral to therapeutic feeding program required');
      recommendations.push('Admit to inpatient care or CMAM program');
      recommendations.push('Provide Ready-to-Use Therapeutic Food (RUTF)');
      recommendations.push('Screen for medical complications');
      recommendations.push('Weekly follow-up monitoring');
    } else if (isMAM) {
      recommendations.push('Enroll in supplementary feeding program');
      recommendations.push('Provide fortified blended food supplements');
      recommendations.push('Weekly follow-up required');
      recommendations.push('Caregiver nutrition counseling');
    }

    if (isStunted) {
      recommendations.push('Long-term nutrition intervention needed');
      recommendations.push('Dietary diversity counseling for caregiver');
      recommendations.push('Monitor growth monthly');
    }

    if (isUnderweight) {
      recommendations.push('Assess feeding practices');
      recommendations.push('Check for underlying illness');
      recommendations.push('Bi-weekly monitoring');
    }

    if (status === 'Normal') {
      recommendations.push('Continue routine growth monitoring');
      recommendations.push('Maintain healthy feeding practices');
      recommendations.push('Next visit in 1 month');
    }

    return recommendations;
  }

  /**
   * Calculate age in months from date of birth
   */
  calculateAgeInMonths(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    return months;
  }

  /**
   * Validate if child is eligible for registration (< 60 months)
   */
  validateAgeForRegistration(dateOfBirth: Date): boolean {
    const ageMonths = this.calculateAgeInMonths(dateOfBirth);
    return ageMonths >= 0 && ageMonths < 60;
  }
}
