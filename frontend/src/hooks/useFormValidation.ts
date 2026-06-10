/**
 * useFormValidation Hook
 * Manages form validation state and error display
 */

import { useState, useCallback } from "react";
import {
  ValidationError,
  validatePhone,
  validateNationalId,
  validateEmail,
  validateWeight,
  validateHeight,
  validateMUAC,
  validateChildName,
  validateApplicationNumber,
  getWeightError,
  getHeightError,
  getMUACError,
  getApplicationNumberError,
  validateDateOfBirth,
} from "@/lib/validation";

export interface FormErrors {
  [field: string]: string | null;
}

export interface FormTouched {
  [field: string]: boolean;
}

/**
 * Hook for managing form validation
 */
export function useFormValidation() {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});

  const setError = useCallback((field: string, error: string | null) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  }, []);

  const validateField = useCallback(
    (field: string, value: string | number | undefined, fieldType?: string) => {
      let error: string | null = null;

      if (!value) {
        if (fieldType === "required") {
          error = `${field} is required`;
        }
        setError(field, error);
        return !error;
      }

      const stringValue = String(value).trim();

      switch (fieldType) {
        case "email":
          if (!validateEmail(stringValue)) {
            error = "Valid email address is required";
          }
          break;

        case "phone":
          if (!validatePhone(stringValue)) {
            error = "Phone number must be 10 digits (e.g., 0700000000)";
          }
          break;

        case "nationalId":
          if (!validateNationalId(stringValue)) {
            error = "National ID must be exactly 16 digits";
          }
          break;

        case "childName":
          if (!validateChildName(stringValue)) {
            error = "Child name must be 2-100 characters";
          }
          break;

        case "weight":
          error = getWeightError(stringValue);
          break;

        case "height":
          error = getHeightError(stringValue);
          break;

        case "muac":
          error = getMUACError(stringValue);
          break;

        case "applicationNumber":
          error = getApplicationNumberError(stringValue);
          break;

        case "dateOfBirth":
          const dobValidation = validateDateOfBirth(stringValue);
          error = dobValidation.valid ? null : (dobValidation.error || "Invalid date");
          break;

        case "minLength":
          if (stringValue.length < 2) {
            error = `${field} must be at least 2 characters`;
          }
          break;

        case "maxLength":
          if (stringValue.length > 100) {
            error = `${field} cannot exceed 100 characters`;
          }
          break;
      }

      setError(field, error);
      return !error;
    },
    [setError]
  );

  const validateForm = useCallback(
    (formData: Record<string, any>, validationSchema: Record<string, string[]>) => {
      const newErrors: FormErrors = {};
      let isValid = true;

      for (const [field, types] of Object.entries(validationSchema)) {
        const value = formData[field];
        let fieldValid = true;

        for (const type of types) {
          if (!validateField(field, value, type)) {
            fieldValid = false;
            isValid = false;
            break;
          }
        }

        if (!fieldValid) {
          newErrors[field] = errors[field] || null;
        }
      }

      return isValid;
    },
    [validateField, errors]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearField = useCallback((field: string) => {
    setError(field, null);
  }, [setError]);

  const getDisplayError = useCallback(
    (field: string) => {
      return touched[field] ? errors[field] : null;
    },
    [errors, touched]
  );

  return {
    errors,
    touched,
    setError,
    setFieldTouched,
    validateField,
    validateForm,
    clearErrors,
    clearField,
    getDisplayError,
  };
}

/**
 * Hook for managing child registration form
 */
export function useChildRegistrationValidation() {
  const validation = useFormValidation();

  const validationSchema = {
    name: ["required", "childName"],
    sex: ["required"],
    dateOfBirth: ["required", "dateOfBirth"],
    caregiverPhone: ["phone"],
    caregiverNationalId: ["nationalId"],
    applicationNumber: ["applicationNumber"],
    province: ["required"],
    district: ["required"],
    sector: ["required"],
    cell: ["required"],
    village: ["required"],
  };

  return {
    ...validation,
    validationSchema,
  };
}

/**
 * Hook for managing assessment form
 */
export function useAssessmentValidation() {
  const validation = useFormValidation();

  const validationSchema = {
    childId: ["required"],
    weight: ["required", "weight"],
    height: ["required", "height"],
    muacCm: ["required", "muac"],
  };

  return {
    ...validation,
    validationSchema,
  };
}

/**
 * Hook for managing user registration form
 */
export function useUserRegistrationValidation() {
  const validation = useFormValidation();

  const validationSchema = {
    name: ["required", "minLength"],
    email: ["required", "email"],
    password: ["required"],
    phone: ["phone"],
    role: ["required"],
  };

  return {
    ...validation,
    validationSchema,
  };
}
