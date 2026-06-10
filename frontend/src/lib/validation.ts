/**
 * Centralized Validation Utilities
 * Defines all validation rules for forms across the application
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Email validation - strict RFC 5322 format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone number validation - Rwanda typically uses 10 digits
 * Format: 0700000000, 0788000000, etc.
 */
export function validatePhone(phone: string): boolean {
  // Remove any spaces or dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  // Rwanda phone numbers are typically 10 digits starting with 0
  return /^0\d{9}$/.test(cleaned) || cleaned.length === 10;
}

export function validatePhoneLength(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return cleaned.length <= 10;
}

/**
 * National ID validation - Rwanda uses 16-digit national ID
 * Format: YYMMMDDNNNNNNNCC (Year-Month-Day-Sequential-Checkdigits)
 */
export function validateNationalId(id: string): boolean {
  // Remove any spaces
  const cleaned = id.replace(/\s/g, '');
  // Must be exactly 16 digits
  return /^\d{16}$/.test(cleaned);
}

export function validateNationalIdLength(id: string): boolean {
  const cleaned = id.replace(/\s/g, '');
  return cleaned.length === 16;
}

/**
 * Child name validation - required, min 2 characters
 */
export function validateChildName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

/**
 * Weight validation - must be between 2 kg and 30 kg (reasonable for children 0-5 years)
 */
export function validateWeight(weight: string): boolean {
  const num = parseFloat(weight);
  return !isNaN(num) && num >= 2 && num <= 30;
}

export function getWeightError(weight: string): string | null {
  if (!weight) return "Weight is required";
  const num = parseFloat(weight);
  if (isNaN(num)) return "Weight must be a number";
  if (num < 2) return "Weight must be at least 2 kg";
  if (num > 30) return "Weight cannot exceed 30 kg";
  return null;
}

/**
 * Height validation - must be between 40 cm and 130 cm (reasonable for children 0-5 years)
 */
export function validateHeight(height: string): boolean {
  const num = parseFloat(height);
  return !isNaN(num) && num >= 40 && num <= 130;
}

export function getHeightError(height: string): string | null {
  if (!height) return "Height is required";
  const num = parseFloat(height);
  if (isNaN(num)) return "Height must be a number";
  if (num < 40) return "Height must be at least 40 cm";
  if (num > 130) return "Height cannot exceed 130 cm";
  return null;
}

/**
 * MUAC validation - now in centimeters (cm)
 * WHO standards:
 * - SAM: < 11.5 cm
 * - MAM: 11.5 - 12.4 cm
 * - Normal: >= 12.5 cm
 * Reasonable range: 5 cm - 20 cm for children 0-5 years
 */
export function validateMUAC(muac: string): boolean {
  const num = parseFloat(muac);
  return !isNaN(num) && num >= 5 && num <= 20;
}

export function getMUACError(muac: string): string | null {
  if (!muac) return "MUAC is required";
  const num = parseFloat(muac);
  if (isNaN(num)) return "MUAC must be a number";
  if (num < 5) return "MUAC must be at least 5 cm";
  if (num > 20) return "MUAC cannot exceed 20 cm";
  return null;
}

/**
 * Age validation - children must be 0-59 months (0-5 years)
 */
export function validateAge(ageMonths: number): boolean {
  return ageMonths >= 0 && ageMonths < 60;
}

export function getAgeError(ageMonths: number): string | null {
  if (ageMonths < 0) return "Age cannot be negative";
  if (ageMonths >= 60) return "Child must be under 60 months (5 years)";
  return null;
}

/**
 * Application number validation - typically numeric/alphanumeric
 */
export function validateApplicationNumber(appNumber: string): boolean {
  if (!appNumber) return true; // Optional field
  return /^[A-Z0-9\-\/]{3,30}$/.test(appNumber.trim());
}

export function getApplicationNumberError(appNumber: string): string | null {
  if (!appNumber) return null; // Optional field
  if (appNumber.length < 3) return "Application number must be at least 3 characters";
  if (appNumber.length > 30) return "Application number cannot exceed 30 characters";
  if (!/^[A-Z0-9\-\/]+$/.test(appNumber.toUpperCase())) return "Application number can only contain letters, numbers, hyphens, and slashes";
  return null;
}

/**
 * Village/Location name validation
 */
export function validateLocationName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

/**
 * Father/Mother name validation - optional but if provided, must be valid
 */
export function validateParentName(name: string): boolean {
  if (!name) return true; // Optional
  return name.trim().length >= 2 && name.trim().length <= 100;
}

/**
 * Caregiver name validation
 */
export function validateCaregiverName(name: string): boolean {
  if (!name) return true; // Optional
  return name.trim().length >= 2 && name.trim().length <= 100;
}

/**
 * Date of birth validation - child must be under 60 months
 */
export function validateDateOfBirth(dateString: string): { valid: boolean; error?: string } {
  if (!dateString) return { valid: false, error: "Date of birth is required" };

  try {
    const dob = new Date(dateString);
    const today = new Date();

    if (dob > today) {
      return { valid: false, error: "Date of birth cannot be in the future" };
    }

    const ageMs = today.getTime() - dob.getTime();
    const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);

    if (ageMonths >= 60) {
      return { valid: false, error: "Child must be under 60 months (5 years) old" };
    }

    if (ageMonths < 0) {
      return { valid: false, error: "Invalid date of birth" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid date format" };
  }
}

/**
 * Comprehensive form validation for Child Registration
 */
export function validateChildRegistration(data: {
  name?: string;
  sex?: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  caregiverNationalId?: string;
  applicationNumber?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.name || !validateChildName(data.name)) {
    errors.push({ field: "name", message: "Child name is required (2-100 characters)" });
  }

  if (!data.sex) {
    errors.push({ field: "sex", message: "Sex is required" });
  }

  const dobValidation = validateDateOfBirth(data.dateOfBirth || "");
  if (!dobValidation.valid) {
    errors.push({ field: "dateOfBirth", message: dobValidation.error || "Invalid date of birth" });
  }

  if (data.fatherName && !validateParentName(data.fatherName)) {
    errors.push({ field: "fatherName", message: "Father name must be 2-100 characters" });
  }

  if (data.motherName && !validateParentName(data.motherName)) {
    errors.push({ field: "motherName", message: "Mother name must be 2-100 characters" });
  }

  if (data.caregiverName && !validateCaregiverName(data.caregiverName)) {
    errors.push({ field: "caregiverName", message: "Caregiver name must be 2-100 characters" });
  }

  if (data.caregiverPhone && !validatePhone(data.caregiverPhone)) {
    errors.push({ field: "caregiverPhone", message: "Phone number must be 10 digits (e.g., 0700000000)" });
  }

  if (data.caregiverNationalId && !validateNationalId(data.caregiverNationalId)) {
    errors.push({ field: "caregiverNationalId", message: "National ID must be exactly 16 digits" });
  }

  if (data.applicationNumber && !validateApplicationNumber(data.applicationNumber)) {
    errors.push({ field: "applicationNumber", message: "Invalid application number format" });
  }

  if (!data.province || !validateLocationName(data.province)) {
    errors.push({ field: "province", message: "Province is required" });
  }

  if (!data.district || !validateLocationName(data.district)) {
    errors.push({ field: "district", message: "District is required" });
  }

  if (!data.sector || !validateLocationName(data.sector)) {
    errors.push({ field: "sector", message: "Sector is required" });
  }

  if (!data.cell || !validateLocationName(data.cell)) {
    errors.push({ field: "cell", message: "Cell is required" });
  }

  if (!data.village || !validateLocationName(data.village)) {
    errors.push({ field: "village", message: "Village is required" });
  }

  return errors;
}

/**
 * Comprehensive form validation for Assessment
 */
export function validateAssessment(data: {
  childId?: string;
  weight?: string;
  height?: string;
  muacCm?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.childId) {
    errors.push({ field: "childId", message: "Child selection is required" });
  }

  const weightError = getWeightError(data.weight || "");
  if (weightError) {
    errors.push({ field: "weight", message: weightError });
  }

  const heightError = getHeightError(data.height || "");
  if (heightError) {
    errors.push({ field: "height", message: heightError });
  }

  const muacError = getMUACError(data.muacCm || "");
  if (muacError) {
    errors.push({ field: "muacCm", message: muacError });
  }

  return errors;
}

/**
 * Comprehensive form validation for User Registration
 */
export function validateUserRegistration(data: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  role?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: "name", message: "Name is required (minimum 2 characters)" });
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.push({ field: "email", message: "Valid email address is required" });
  }

  if (!data.password || data.password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
  }

  if (data.password !== data.confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push({ field: "phone", message: "Phone number must be 10 digits (e.g., 0700000000)" });
  }

  if (!data.role) {
    errors.push({ field: "role", message: "Role is required" });
  }

  return errors;
}
