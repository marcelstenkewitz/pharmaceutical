// DEA Number Validation (Simplified for app purposes)
export const validateDEANumber = (deaNumber) => {
  if (!deaNumber) {
    return { isValid: false, error: 'DEA number is required' };
  }

  const dea = deaNumber.toString().trim();
  
  if (dea.length !== 9) {
    return { isValid: false, error: 'DEA number must be exactly 9 characters' };
  }

  return { isValid: true, error: null };
};