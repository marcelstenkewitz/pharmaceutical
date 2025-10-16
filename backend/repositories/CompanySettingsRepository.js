const BaseRepository = require('./base/BaseRepository');

class CompanySettingsRepository extends BaseRepository {
  constructor(dataDir) {
    super('company-settings.json', dataDir);
  }

  getDefaultData() {
    return {
      companyName: 'Direct Returns',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      deaNumber: ''
    };
  }

  validateData(data) {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.companyName === 'string'
    );
  }

  // Get company settings (there's only one set of settings)
  getSettings() {
    return this.readData();
  }

  // Update company settings
  updateSettings(updates) {
    const currentSettings = this.readData();

    const updatedSettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.validateSettings(updatedSettings);
    this.writeData(updatedSettings);
    return updatedSettings;
  }

  // DEA Number Validation
  validateDEANumber(deaNumber) {
    if (!deaNumber) {
      return true; // DEA number is optional
    }

    const dea = deaNumber.toString().trim();

    if (dea.length !== 9) {
      throw new Error('DEA number must be exactly 9 characters');
    }

    // DEA format: 2 letters + 7 digits
    if (!/^[A-Z]{2}\d{7}$/.test(dea)) {
      throw new Error('DEA number must be in format: 2 letters followed by 7 digits (e.g., AB1234567)');
    }

    return true;
  }

  // Validation method
  validateSettings(settings) {
    if (!settings.companyName || typeof settings.companyName !== 'string') {
      throw new Error('companyName is required and must be a string');
    }

    if (settings.zipCode && !/^\d{5}(-\d{4})?$/.test(settings.zipCode)) {
      throw new Error('zipCode must be in format 12345 or 12345-6789');
    }

    if (settings.state && settings.state.length > 2) {
      throw new Error('state must be a 2-letter state code');
    }

    // Validate DEA number if provided
    if (settings.deaNumber) {
      this.validateDEANumber(settings.deaNumber);
    }

    return true;
  }

  // Override count since this is a singleton
  count() {
    return 1;
  }

  // Override findAll since this is a singleton
  findAll() {
    return [this.getSettings()];
  }
}

module.exports = CompanySettingsRepository;
