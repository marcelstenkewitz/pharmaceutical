const ClientRepository = require('../repositories/ClientRepository');
const ReportRepository = require('../repositories/ReportRepository');
const ManualEntryRepository = require('../repositories/ManualEntryRepository');
const LabelerRepository = require('../repositories/LabelerRepository');
const ManufacturerRepository = require('../repositories/ManufacturerRepository');
const CompanySettingsRepository = require('../repositories/CompanySettingsRepository');

class RepositoryService {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this._clients = null;
    this._reports = null;
    this._manualEntries = null;
    this._labelers = null;
    this._manufacturers = null;
    this._companySettings = null;
  }

  get clients() {
    if (!this._clients) {
      this._clients = new ClientRepository(this.dataDir, this.reports);
    }
    return this._clients;
  }

  get reports() {
    if (!this._reports) {
      this._reports = new ReportRepository(this.dataDir);
    }
    return this._reports;
  }

  get manualEntries() {
    if (!this._manualEntries) {
      this._manualEntries = new ManualEntryRepository(this.dataDir);
    }
    return this._manualEntries;
  }

  get labelers() {
    if (!this._labelers) {
      this._labelers = new LabelerRepository(this.dataDir);
    }
    return this._labelers;
  }

  get manufacturers() {
    if (!this._manufacturers) {
      this._manufacturers = new ManufacturerRepository(this.dataDir);
    }
    return this._manufacturers;
  }

  get companySettings() {
    if (!this._companySettings) {
      this._companySettings = new CompanySettingsRepository(this.dataDir);
    }
    return this._companySettings;
  }

  ensureInitialized() {
    try {
      this.clients.count();
      this.reports.count();
      this.manualEntries.count();
      this.labelers.count();
      this.manufacturers.count();
      this.companySettings.count();
      console.log('All repositories initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize repositories:', error);
      throw new Error(`Repository initialization failed: ${error.message}`);
    }
  }

  healthCheck() {
    const health = {
      dataDir: this.dataDir,
      timestamp: new Date().toISOString(),
      repositories: {}
    };

    try {
      health.repositories.clients = {
        status: 'healthy',
        count: this.clients.count()
      };
    } catch (error) {
      health.repositories.clients = {
        status: 'error',
        error: error.message
      };
    }

    try {
      health.repositories.reports = {
        status: 'healthy',
        count: this.reports.count()
      };
    } catch (error) {
      health.repositories.reports = {
        status: 'error',
        error: error.message
      };
    }

    try {
      health.repositories.manualEntries = {
        status: 'healthy',
        count: this.manualEntries.count()
      };
    } catch (error) {
      health.repositories.manualEntries = {
        status: 'error',
        error: error.message
      };
    }

    try {
      health.repositories.labelers = {
        status: 'healthy',
        count: this.labelers.count()
      };
    } catch (error) {
      health.repositories.labelers = {
        status: 'error',
        error: error.message
      };
    }

    try {
      health.repositories.manufacturers = {
        status: 'healthy',
        count: this.manufacturers.count()
      };
    } catch (error) {
      health.repositories.manufacturers = {
        status: 'error',
        error: error.message
      };
    }

    health.overallStatus = Object.values(health.repositories).every(repo => repo.status === 'healthy')
      ? 'healthy'
      : 'degraded';

    return health;
  }

  getDashboardStats() {
    try {
      const stats = {
        clients: {
          total: this.clients.count(),
          recentlyAdded: this.clients.findAll().filter(client => {
            const createdDate = new Date(client.createdAt);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return createdDate >= sevenDaysAgo;
          }).length
        },
        reports: this.reports.getStatistics(),
        manualEntries: this.manualEntries.getStatistics(),
        labelers: this.labelers.getStatistics()
      };

      const totalReports = this.clients.findAll().reduce((total, client) => {
        return total + (client.reports ? client.reports.length : 0);
      }, 0);

      stats.clients.totalReports = totalReports;

      return stats;
    } catch (error) {
      console.error('Error generating dashboard stats:', error);
      throw new Error(`Failed to generate dashboard statistics: ${error.message}`);
    }
  }

  backupAllData() {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    try {
      backup.data.clients = this.clients.findAll();
      backup.data.reports = this.reports.findAll();
      backup.data.manualEntries = this.manualEntries.findAll();
      backup.data.labelers = this.labelers.findAll();

      return backup;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  restoreFromBackup(backupData) {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup data format');
    }

    const results = {
      clients: 0,
      reports: 0,
      manualEntries: 0,
      labelers: 0,
      errors: []
    };

    try {
      if (backupData.data.clients) {
        this.clients.clear();
        backupData.data.clients.forEach(client => {
          try {
            this.clients.create(client);
            results.clients++;
          } catch (error) {
            results.errors.push(`Client ${client.id}: ${error.message}`);
          }
        });
      }

      if (backupData.data.reports) {
        this.reports.clear();
        backupData.data.reports.forEach(report => {
          try {
            this.reports.create(report);
            results.reports++;
          } catch (error) {
            results.errors.push(`Report ${report.id}: ${error.message}`);
          }
        });
      }

      if (backupData.data.manualEntries) {
        this.manualEntries.clear();
        Object.entries(backupData.data.manualEntries).forEach(([barcode, entry]) => {
          try {
            this.manualEntries.create(barcode, entry);
            results.manualEntries++;
          } catch (error) {
            results.errors.push(`Manual entry ${barcode}: ${error.message}`);
          }
        });
      }

      if (backupData.data.labelers) {
        this.labelers.clear();
        backupData.data.labelers.forEach(labeler => {
          try {
            this.labelers.create(labeler);
            results.labelers++;
          } catch (error) {
            results.errors.push(`Labeler ${labeler.labeler_name}: ${error.message}`);
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error(`Failed to restore from backup: ${error.message}`);
    }
  }

  validateDataIntegrity() {
    const issues = [];

    try {
      const clients = this.clients.findAll();

      clients.forEach(client => {
        if (!client.id) {
          issues.push(`Client missing ID: ${client.businessName}`);
        }

        if (client.reports) {
          client.reports.forEach(report => {
            if (!report.id) {
              issues.push(`Report missing ID in client ${client.id}`);
            }

            if (report.lineItems) {
              const lineItemIds = report.lineItems.map(item => item.id);
              const uniqueIds = new Set(lineItemIds);
              if (lineItemIds.length !== uniqueIds.size) {
                issues.push(`Duplicate line item IDs in report ${report.id}`);
              }
            }
          });
        }
      });

      const manualEntries = this.manualEntries.findAll();
      Object.values(manualEntries).forEach(entry => {
        if (!entry.product_ndc) {
          issues.push('Manual entry missing product_ndc');
        }
        if (!entry.generic_name) {
          issues.push('Manual entry missing generic_name');
        }
      });

      const labelers = this.labelers.findAll();
      const labelerNames = labelers.map(l => l.labeler_name).filter(Boolean);
      const uniqueLabelerNames = new Set(labelerNames);
      if (labelerNames.length !== uniqueLabelerNames.size) {
        issues.push('Duplicate labeler names found');
      }

    } catch (error) {
      issues.push(`Data validation error: ${error.message}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      checkedAt: new Date().toISOString()
    };
  }

  clearAllData() {
    try {
      this.clients.clear();
      this.reports.clear();
      this.manualEntries.clear();
      this.labelers.clear();

      return {
        success: true,
        message: 'All data cleared successfully',
        clearedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }
}

let repositoryServiceInstance = null;

function createRepositoryService(dataDir) {
  if (!repositoryServiceInstance) {
    repositoryServiceInstance = new RepositoryService(dataDir);
  }
  return repositoryServiceInstance;
}

function getRepositoryService() {
  if (!repositoryServiceInstance) {
    throw new Error('Repository service not initialized. Call createRepositoryService() first.');
  }
  return repositoryServiceInstance;
}

module.exports = {
  RepositoryService,
  createRepositoryService,
  getRepositoryService
};