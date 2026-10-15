/**
 * Password Policy Enforcement Utility
 * Implements modern NIST 800-63B / OWASP password security recommendations.
 */

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'admin123',
  'welcome123',
  'letmein123',
  'dwello123',
  'rental123',
  'manager123',
]);

const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialCharsRegex: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
};

/**
 * Validates a password against the policy.
 * @param {string} password 
 * @returns {{ valid: boolean, errors: string[], message?: string }}
 */
function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'], message: 'Password is required' };
  }

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  if (PASSWORD_POLICY.requireSpecialChar && !PASSWORD_POLICY.specialCharsRegex.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase().trim())) {
    errors.push('Password is too common and easily guessed. Please choose a more secure password');
  }

  return {
    valid: errors.length === 0,
    errors,
    message: errors.length > 0 ? errors[0] : undefined,
  };
}

/**
 * Calculates password strength score (0-4) and criteria checklist.
 * @param {string} password
 */
function checkPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: 'Too short',
      checks: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
      isValid: false,
    };
  }

  const checks = {
    length: password.length >= PASSWORD_POLICY.minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: PASSWORD_POLICY.specialCharsRegex.test(password),
  };

  let score = 0;
  if (checks.length) score++;
  if (checks.uppercase && checks.lowercase) score++;
  if (checks.number) score++;
  if (checks.special) score++;

  if (password.length >= 12 && score >= 3) {
    score = 4;
  }

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return {
    score,
    label: labels[score] || 'Weak',
    checks,
    isValid: Object.values(checks).every(Boolean) && !COMMON_WEAK_PASSWORDS.has(password.toLowerCase()),
  };
}

module.exports = {
  validatePassword,
  checkPasswordStrength,
  PASSWORD_POLICY,
};
