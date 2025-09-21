const BaseRepository = require('./base/BaseRepository');

class ManualEntryRepository extends BaseRepository {
  constructor(dataDir) {
    super('manual-entries.json', dataDir);
  }

  getDefaultData() {
    return {};
  }

  validateData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }

    return Object.values(data).every(entry =>
      entry &&
      typeof entry === 'object' &&
      typeof entry.product_ndc === 'string' &&
      typeof entry.generic_name === 'string'
    );
  }

  findByBarcode(barcode) {
    const entries = this.readData();
    return entries[barcode] || null;
  }

  findByNDC(ndc) {
    const entries = this.readData();
    return Object.values(entries).find(entry => entry.product_ndc === ndc) || null;
  }

  findByName(name) {
    const entries = this.readData();
    const searchTerm = name.toLowerCase();

    return Object.values(entries).filter(entry =>
      entry.generic_name?.toLowerCase().includes(searchTerm) ||
      entry.brand_name?.toLowerCase().includes(searchTerm) ||
      entry.labeler_name?.toLowerCase().includes(searchTerm)
    );
  }

  create(barcode, entryData) {
    const entries = this.readData();

    if (entries[barcode]) {
      throw new Error(`Manual entry with barcode ${barcode} already exists`);
    }

    const newEntry = {
      ...entryData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    entries[barcode] = newEntry;
    this.writeData(entries);
    return newEntry;
  }

  update(barcode, updates) {
    const entries = this.readData();

    if (!entries[barcode]) {
      throw new Error(`Manual entry with barcode ${barcode} not found`);
    }

    entries[barcode] = {
      ...entries[barcode],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.writeData(entries);
    return entries[barcode];
  }

  upsert(barcode, entryData) {
    const entries = this.readData();

    const entry = {
      ...entryData,
      updatedAt: new Date().toISOString()
    };

    if (!entries[barcode]) {
      entry.createdAt = new Date().toISOString();
    } else {
      entry.createdAt = entries[barcode].createdAt || new Date().toISOString();
    }

    entries[barcode] = entry;
    this.writeData(entries);
    return entry;
  }

  delete(barcode) {
    const entries = this.readData();

    if (!entries[barcode]) {
      throw new Error(`Manual entry with barcode ${barcode} not found`);
    }

    const deletedEntry = entries[barcode];
    delete entries[barcode];

    this.writeData(entries);
    return deletedEntry;
  }

  exists(barcode) {
    const entries = this.readData();
    return barcode in entries;
  }

  findAll() {
    return this.readData();
  }

  getAllBarcodes() {
    const entries = this.readData();
    return Object.keys(entries);
  }

  getAllEntries() {
    const entries = this.readData();
    return Object.entries(entries).map(([barcode, entry]) => ({
      barcode,
      ...entry
    }));
  }

  search(query) {
    const entries = this.readData();
    const searchTerm = query.toLowerCase();

    const matchingEntries = [];

    for (const [barcode, entry] of Object.entries(entries)) {
      if (
        barcode.toLowerCase().includes(searchTerm) ||
        entry.product_ndc?.toLowerCase().includes(searchTerm) ||
        entry.generic_name?.toLowerCase().includes(searchTerm) ||
        entry.brand_name?.toLowerCase().includes(searchTerm) ||
        entry.labeler_name?.toLowerCase().includes(searchTerm) ||
        entry.route?.toLowerCase().includes(searchTerm) ||
        entry.dosage_form?.toLowerCase().includes(searchTerm)
      ) {
        matchingEntries.push({
          barcode,
          ...entry
        });
      }
    }

    return matchingEntries;
  }

  getByLabeler(labelerName) {
    const entries = this.readData();
    const matchingEntries = [];

    for (const [barcode, entry] of Object.entries(entries)) {
      if (entry.labeler_name?.toLowerCase() === labelerName.toLowerCase()) {
        matchingEntries.push({
          barcode,
          ...entry
        });
      }
    }

    return matchingEntries;
  }

  getBySchedule(schedule) {
    const entries = this.readData();
    const matchingEntries = [];

    for (const [barcode, entry] of Object.entries(entries)) {
      if (entry.dea_schedule === schedule) {
        matchingEntries.push({
          barcode,
          ...entry
        });
      }
    }

    return matchingEntries;
  }

  validateEntry(entryData) {
    const required = ['product_ndc', 'generic_name', 'labeler_name'];

    for (const field of required) {
      if (!entryData[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    if (entryData.product_ndc && typeof entryData.product_ndc !== 'string') {
      throw new Error('product_ndc must be a string');
    }

    if (entryData.dea_schedule && !['CI', 'CII', 'CIII', 'CIV', 'CV'].includes(entryData.dea_schedule)) {
      throw new Error('dea_schedule must be one of: CI, CII, CIII, CIV, CV');
    }

    return true;
  }

  createValidated(barcode, entryData) {
    this.validateEntry(entryData);
    return this.create(barcode, entryData);
  }

  updateValidated(barcode, updates) {
    if (Object.keys(updates).some(key => ['product_ndc', 'generic_name', 'labeler_name'].includes(key))) {
      const currentEntry = this.findByBarcode(barcode);
      if (!currentEntry) {
        throw new Error(`Manual entry with barcode ${barcode} not found`);
      }

      const updatedEntry = { ...currentEntry, ...updates };
      this.validateEntry(updatedEntry);
    }

    return this.update(barcode, updates);
  }

  count() {
    const entries = this.readData();
    return Object.keys(entries).length;
  }

  getStatistics() {
    const entries = this.readData();
    const allEntries = Object.values(entries);

    const scheduleBreakdown = allEntries.reduce((breakdown, entry) => {
      const schedule = entry.dea_schedule || 'Unknown';
      breakdown[schedule] = (breakdown[schedule] || 0) + 1;
      return breakdown;
    }, {});

    const labelerBreakdown = allEntries.reduce((breakdown, entry) => {
      const labeler = entry.labeler_name || 'Unknown';
      breakdown[labeler] = (breakdown[labeler] || 0) + 1;
      return breakdown;
    }, {});

    return {
      totalEntries: allEntries.length,
      totalBarcodes: Object.keys(entries).length,
      scheduleBreakdown,
      topLabelers: Object.entries(labelerBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    };
  }

  clear() {
    this.writeData({});
  }
}

module.exports = ManualEntryRepository;