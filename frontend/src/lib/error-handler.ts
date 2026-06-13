/**
 * Error Handler Utility
 * 
 * Provides user-friendly error messages instead of technical errors
 */

/**
 * Extract user-friendly error message from API error
 */
export function getErrorMessage(error: any): string {
  // If error has a direct message property (from our API client)
  if (error?.message && typeof error.message === 'string') {
    return formatErrorMessage(error.message);
  }

  // If error has nested data.message (some API responses)
  if (error?.data?.message) {
    if (Array.isArray(error.data.message)) {
      return error.data.message.map(formatErrorMessage).join(', ');
    }
    return formatErrorMessage(error.data.message);
  }

  // If error has response data (fetch errors)
  if (error?.response?.data?.message) {
    if (Array.isArray(error.response.data.message)) {
      return error.response.data.message.map(formatErrorMessage).join(', ');
    }
    return formatErrorMessage(error.response.data.message);
  }

  // Network errors
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }

  // Timeout errors
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Status code specific messages
  if (error?.statusCode) {
    switch (error.statusCode) {
      case 400:
        return 'Invalid data provided. Please check your inputs.';
      case 401:
        return 'You are not authorized. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This record already exists.';
      case 422:
        return 'Invalid data. Please check your inputs.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return `Error (${error.statusCode}). Please try again.`;
    }
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Format technical error messages into user-friendly ones
 */
function formatErrorMessage(message: string): string {
  // Already user-friendly messages from backend validation
  const userFriendlyPatterns = [
    /must be \d+ digits/i,
    /must be.*email/i,
    /must be between/i,
    /must not be less than/i,
    /must not be greater than/i,
    /should not be empty/i,
    /is required/i,
    /already exists/i,
  ];

  // Check if message is already user-friendly
  if (userFriendlyPatterns.some(pattern => pattern.test(message))) {
    return message;
  }

  // Map technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'Unique constraint failed on the constraint: `users_code_key`': 
      'Unable to generate a unique user code. Please try again.',
    'Unique constraint failed on the constraint: `users_email_key`': 
      'This email address is already registered.',
    'Unique constraint failed on the constraint: `children_code_key`': 
      'Unable to generate a unique child code. Please try again.',
    'Unique constraint failed on the constraint: `facilities_code_key`': 
      'Unable to generate a unique facility code. Please try again.',
    'P2002': 
      'This record already exists in the system.',
    'P2003': 
      'Invalid reference. The related record does not exist.',
    'P2025': 
      'Record not found.',
    'Failed to generate a unique user code after multiple attempts.':
      'System is busy generating user codes. Please try again in a moment.',
    'User with this email already exists':
      'This email address is already registered.',
    'Invalid credentials':
      'Incorrect email or password.',
    'Incorrect password':
      'The current password is incorrect.',
  };

  // Check for exact matches
  for (const [technical, friendly] of Object.entries(errorMappings)) {
    if (message.includes(technical)) {
      return friendly;
    }
  }

  // Return the original message if no mapping found
  // (it might already be user-friendly from backend validation)
  return message;
}

/**
 * Handle errors with toast notifications
 * Usage: handleError(error, 'Failed to save user')
 */
export function handleError(error: any, fallbackMessage: string = 'An error occurred'): string {
  const message = getErrorMessage(error);
  
  // Log to console for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error('Error details:', error);
  }

  return message || fallbackMessage;
}
