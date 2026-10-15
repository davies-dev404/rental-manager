/**
 * Client Password Policy Utilities
 * Enforces length, diversity, and provides real-time strength scoring.
 */

export const PASSWORD_CRITERIA = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (pwd) => Boolean(pwd && pwd.length >= 8),
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter (A-Z)",
    test: (pwd) => Boolean(pwd && /[A-Z]/.test(pwd)),
  },
  {
    id: "lowercase",
    label: "At least 1 lowercase letter (a-z)",
    test: (pwd) => Boolean(pwd && /[a-z]/.test(pwd)),
  },
  {
    id: "number",
    label: "At least 1 number (0-9)",
    test: (pwd) => Boolean(pwd && /[0-9]/.test(pwd)),
  },
  {
    id: "special",
    label: "At least 1 special character (!@#$%...)",
    test: (pwd) => Boolean(pwd && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)),
  },
];

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "qwerty123",
  "admin123",
  "welcome123",
  "letmein123",
]);

/**
 * Evaluates password strength and criteria fulfilment.
 * @param {string} password
 */
export function evaluatePassword(password = "") {
  const pwd = password || "";
  const checks = {};
  let passedCount = 0;

  for (const criterion of PASSWORD_CRITERIA) {
    const passed = criterion.test(pwd);
    checks[criterion.id] = passed;
    if (passed) passedCount++;
  }

  const isCommon = COMMON_WEAK_PASSWORDS.has(pwd.toLowerCase().trim());

  // Score from 0 to 4
  let score = 0;
  if (pwd.length >= 8) score++;
  if (checks.uppercase && checks.lowercase) score++;
  if (checks.number) score++;
  if (checks.special) score++;

  if (pwd.length >= 12 && passedCount === 5) {
    score = 4;
  }

  if (isCommon && score > 1) {
    score = 1;
  }

  const STRENGTH_CONFIGS = [
    { label: "Very Weak", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
    { label: "Weak", color: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
    { label: "Fair", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
    { label: "Good", color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { label: "Strong", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  ];

  const currentConfig = STRENGTH_CONFIGS[score] || STRENGTH_CONFIGS[0];

  const isValid = passedCount === PASSWORD_CRITERIA.length && !isCommon;

  return {
    score,
    passedCount,
    totalCriteria: PASSWORD_CRITERIA.length,
    label: currentConfig.label,
    color: currentConfig.color,
    textColor: currentConfig.text,
    checks,
    isValid,
    isCommon,
  };
}

/**
 * Quick validation check with first error message.
 * @param {string} password
 */
export function validatePassword(password = "") {
  const result = evaluatePassword(password);
  if (result.isValid) {
    return { valid: true };
  }

  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!result.checks.uppercase) {
    return { valid: false, message: "Password must include at least one uppercase letter." };
  }
  if (!result.checks.lowercase) {
    return { valid: false, message: "Password must include at least one lowercase letter." };
  }
  if (!result.checks.number) {
    return { valid: false, message: "Password must include at least one number." };
  }
  if (!result.checks.special) {
    return { valid: false, message: "Password must include at least one special character (!@#$%...)." };
  }
  if (result.isCommon) {
    return { valid: false, message: "Password is too common and easily guessed." };
  }

  return { valid: false, message: "Password does not meet security requirements." };
}
