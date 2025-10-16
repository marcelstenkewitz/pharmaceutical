/**
 * DEA Number Validation Utility
 *
 * Validates DEA numbers according to the standard format and checksum algorithm.
 * DEA numbers are 9 characters: 2 letters + 7 digits
 *
 * Format: [Registration Type][Last Name Initial][Registrant Identifier][Check Digit]
 * Example: AB1234563
 */

/**
 * Validate DEA number format and checksum
 * @param {string} deaNumber - DEA number to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateDEANumber(deaNumber) {
  if (!deaNumber) {
    return { isValid: false, error: 'DEA number is required' };
  }

  const dea = deaNumber.toString().trim().toUpperCase();

  // Check length
  if (dea.length !== 9) {
    return { isValid: false, error: 'DEA number must be exactly 9 characters' };
  }

  // Check format: 2 letters + 7 digits
  const deaPattern = /^[A-Z]{2}\d{7}$/;
  if (!deaPattern.test(dea)) {
    return { isValid: false, error: 'DEA number must be 2 letters followed by 7 digits' };
  }

  // First letter must be A, B, C, D, E, F, G, H, J, K, L, M, P, R, S, T, U, or X
  const validFirstLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'P', 'R', 'S', 'T', 'U', 'X'];
  if (!validFirstLetters.includes(dea[0])) {
    return { isValid: false, error: 'Invalid DEA number prefix' };
  }

  // Validate checksum using DEA algorithm
  const digits = dea.substring(2); // Get the 7 digits
  const checkDigit = parseInt(digits[6]); // Last digit is the check digit

  // Sum of odd-positioned digits (1st, 3rd, 5th)
  const oddSum = parseInt(digits[0]) + parseInt(digits[2]) + parseInt(digits[4]);

  // Sum of even-positioned digits (2nd, 4th, 6th) multiplied by 2
  const evenSum = (parseInt(digits[1]) + parseInt(digits[3]) + parseInt(digits[5])) * 2;

  // Total sum
  const total = oddSum + evenSum;

  // The check digit should be the last digit of the total
  const calculatedCheckDigit = total % 10;

  if (calculatedCheckDigit !== checkDigit) {
    return { isValid: false, error: 'Invalid DEA number checksum' };
  }

  return { isValid: true, error: null };
}

/**
 * Validate DEA number or allow null/empty values
 * @param {string|null} deaNumber - DEA number to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateDEANumberOptional(deaNumber) {
  // Allow null or empty strings
  if (!deaNumber || deaNumber.toString().trim() === '') {
    return { isValid: true, error: null };
  }

  return validateDEANumber(deaNumber);
}

module.exports = {
  validateDEANumber,
  validateDEANumberOptional
};
