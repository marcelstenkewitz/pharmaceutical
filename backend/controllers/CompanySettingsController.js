class CompanySettingsController {
  constructor(repositories) {
    this.repositories = repositories;
  }

  // GET /api/company-settings
  getSettings(_req, res) {
    try {
      const settings = this.repositories.companySettings.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      res.status(500).json({ error: 'Failed to fetch company settings' });
    }
  }

  // PUT /api/company-settings
  updateSettings(req, res) {
    try {
      const updates = req.body;

      // Validate that at least one field is provided
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No update data provided' });
      }

      const updatedSettings = this.repositories.companySettings.updateSettings(updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating company settings:', error);
      if (error.message.includes('required') || error.message.includes('must be')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update company settings' });
      }
    }
  }
}

module.exports = CompanySettingsController;
