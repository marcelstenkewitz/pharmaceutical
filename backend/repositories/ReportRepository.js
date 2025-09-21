const BaseRepository = require('./base/BaseRepository');

class ReportRepository extends BaseRepository {
  constructor(dataDir) {
    super('reports.json', dataDir);
    this.ensureDataConsistency();
  }

  ensureDataConsistency() {
    try {
      const reports = this.readData();
      let needsUpdate = false;

      reports.forEach(report => {
        // Ensure all line items have IDs
        if (report.lineItems) {
          report.lineItems.forEach(item => {
            if (!item.id) {
              item.id = this.generateId();
              needsUpdate = true;
              console.log(`Added missing ID to line item in report ${report.id}: ${item.id}`);
            }
          });

          // Ensure items array is synchronized with lineItems
          if (!report.items || JSON.stringify(report.items) !== JSON.stringify(report.lineItems)) {
            report.items = [...report.lineItems];
            needsUpdate = true;
            console.log(`Synchronized items array for report ${report.id}`);
          }

          // Ensure itemsCount is correct
          if (report.itemsCount !== report.lineItems.length) {
            report.itemsCount = report.lineItems.length;
            needsUpdate = true;
            console.log(`Updated itemsCount for report ${report.id}: ${report.itemsCount}`);
          }
        }
      });

      if (needsUpdate) {
        this.writeData(reports);
        console.log('Reports data consistency fixed');
      }
    } catch (error) {
      console.warn('Failed to ensure data consistency:', error);
    }
  }

  getDefaultData() {
    return [];
  }

  validateData(data) {
    if (!Array.isArray(data)) return false;

    return data.every(report =>
      report &&
      typeof report === 'object' &&
      typeof report.id === 'string'
    );
  }

  create(reportData) {
    const newReport = {
      ...reportData,
      id: reportData.id || this.generateId(),
      name: reportData.name || `Report ${new Date().toISOString()}`,
      createdAt: reportData.createdAt || new Date().toISOString(),
      timestamp: reportData.timestamp || new Date().toISOString(),
      lineItems: reportData.lineItems || reportData.items || [],
      items: reportData.items || reportData.lineItems || [],
      itemsCount: (reportData.lineItems || reportData.items || []).length,
      updatedAt: new Date().toISOString()
    };

    return super.create(newReport);
  }

  update(id, updates) {
    if (updates.lineItems || updates.items) {
      const lineItems = updates.lineItems || updates.items;
      updates.lineItems = lineItems;
      updates.items = lineItems;
      updates.itemsCount = lineItems.length;
    }

    return super.update(id, updates);
  }

  findByClientId(clientId) {
    const reports = this.readData();
    return reports.filter(report => report.clientId === clientId);
  }

  findByDateRange(startDate, endDate) {
    const reports = this.readData();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return reports.filter(report => {
      const reportDate = new Date(report.createdAt || report.timestamp);
      return reportDate >= start && reportDate <= end;
    });
  }

  addLineItem(reportId, lineItemData) {
    const reports = this.readData();
    const reportIndex = reports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      throw new Error(`Report with id ${reportId} not found`);
    }

    const report = reports[reportIndex];

    if (!report.lineItems) {
      report.lineItems = [];
    }

    const newLineItem = {
      ...lineItemData,
      id: lineItemData.id || this.generateId(),
      lineNo: report.lineItems.length + 1,
      createdAt: new Date().toISOString()
    };

    report.lineItems.push(newLineItem);
    report.items = report.lineItems;
    report.itemsCount = report.lineItems.length;
    report.updatedAt = new Date().toISOString();

    this.writeData(reports);
    return newLineItem;
  }

  updateLineItem(reportId, itemId, updates) {
    console.log(`Updating line item ${itemId} in report ${reportId} with:`, updates);

    const reports = this.readData();
    const reportIndex = reports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      throw new Error(`Report with id ${reportId} not found`);
    }

    const report = reports[reportIndex];
    const itemIndex = report.lineItems?.findIndex(item => item.id === itemId);

    if (itemIndex === -1 || itemIndex === undefined) {
      throw new Error(`Line item with id ${itemId} not found in report ${reportId}`);
    }

    // Only update fields that have actual values (not undefined, null, or empty strings)
    const validUpdates = {};
    Object.keys(updates).forEach(key => {
      const value = updates[key];

      // Handle numeric fields - allow zero values but not undefined/null
      if (key === 'packages' || key === 'pricePerEA' || key === 'pricePerUnit' || key === 'unitsPerPackage') {
        if (typeof value === 'number' && !isNaN(value)) {
          validUpdates[key] = value;
        }
      }
      // Handle string fields - only include if they have actual content
      else if (value !== undefined && value !== null && value !== '' && String(value).trim() !== '') {
        validUpdates[key] = value;
      }
    });

    console.log(`Valid updates after filtering:`, validUpdates);

    report.lineItems[itemIndex] = {
      ...report.lineItems[itemIndex],
      ...validUpdates,
      id: itemId,
      updatedAt: new Date().toISOString()
    };

    report.items = report.lineItems;
    report.updatedAt = new Date().toISOString();

    this.writeData(reports);
    console.log(`Successfully updated line item ${itemId}`);
    return report.lineItems[itemIndex];
  }

  deleteLineItem(reportId, itemId) {
    const reports = this.readData();
    const reportIndex = reports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      throw new Error(`Report with id ${reportId} not found`);
    }

    const report = reports[reportIndex];
    const itemIndex = report.lineItems?.findIndex(item => item.id === itemId);

    if (itemIndex === -1 || itemIndex === undefined) {
      throw new Error(`Line item with id ${itemId} not found in report ${reportId}`);
    }

    const deletedItem = report.lineItems.splice(itemIndex, 1)[0];

    report.lineItems.forEach((item, index) => {
      item.lineNo = index + 1;
    });

    report.items = report.lineItems;
    report.itemsCount = report.lineItems.length;
    report.updatedAt = new Date().toISOString();

    this.writeData(reports);
    return deletedItem;
  }

  getLineItems(reportId) {
    const report = this.findById(reportId);
    if (!report) {
      throw new Error(`Report with id ${reportId} not found`);
    }

    return report.lineItems || [];
  }

  getLineItem(reportId, itemId) {
    const report = this.findById(reportId);
    if (!report) {
      throw new Error(`Report with id ${reportId} not found`);
    }

    const lineItem = report.lineItems?.find(item => item.id === itemId);
    if (!lineItem) {
      throw new Error(`Line item with id ${itemId} not found in report ${reportId}`);
    }

    return lineItem;
  }

  search(query) {
    const reports = this.readData();
    const searchTerm = query.toLowerCase();

    return reports.filter(report =>
      report.name?.toLowerCase().includes(searchTerm) ||
      report.id?.toLowerCase().includes(searchTerm) ||
      report.clientId?.toLowerCase().includes(searchTerm) ||
      report.lineItems?.some(item =>
        item.itemName?.toLowerCase().includes(searchTerm) ||
        item.ndc11?.includes(searchTerm) ||
        item.labeler_name?.toLowerCase().includes(searchTerm)
      )
    );
  }

  getReportSummary(reportId) {
    const report = this.findById(reportId);
    if (!report) {
      throw new Error(`Report with id ${reportId} not found`);
    }

    const lineItems = report.lineItems || [];
    const totalItems = lineItems.length;
    const totalPackages = lineItems.reduce((sum, item) => sum + (item.packages || 0), 0);
    const totalValue = lineItems.reduce((sum, item) => {
      const packages = item.packages || 0;
      const pricePerEA = item.pricePerEA || 0;
      const packageSize = item.packageSize || '';
      const unitsPerPackage = this.extractUnitsFromPackageSize(packageSize);
      return sum + (packages * unitsPerPackage * pricePerEA);
    }, 0);

    const scheduleBreakdown = lineItems.reduce((breakdown, item) => {
      const schedule = item.dea_schedule || 'Unknown';
      breakdown[schedule] = (breakdown[schedule] || 0) + 1;
      return breakdown;
    }, {});

    return {
      reportId,
      reportName: report.name,
      createdAt: report.createdAt,
      totalItems,
      totalPackages,
      totalValue: Math.round(totalValue * 100) / 100,
      scheduleBreakdown
    };
  }

  extractUnitsFromPackageSize(packageSize) {
    const match = packageSize.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1;
  }

  getStatistics() {
    const reports = this.readData();
    const totalReports = reports.length;
    const totalLineItems = reports.reduce((sum, report) => sum + (report.lineItems?.length || 0), 0);

    const recentReports = reports.filter(report => {
      const reportDate = new Date(report.createdAt || report.timestamp);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return reportDate >= thirtyDaysAgo;
    });

    return {
      totalReports,
      totalLineItems,
      recentReports: recentReports.length,
      averageItemsPerReport: totalReports > 0 ? Math.round((totalLineItems / totalReports) * 100) / 100 : 0
    };
  }
}

module.exports = ReportRepository;