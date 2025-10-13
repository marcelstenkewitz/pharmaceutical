const BaseRepository = require('./base/BaseRepository');

class LabelerRepository extends BaseRepository {
  constructor(dataDir) {
    super('labelers.json', dataDir);
  }

  getDefaultData() {
    return [];
  }

  validateData(data) {
    if (!Array.isArray(data)) return false;

    return data.every(labeler =>
      labeler &&
      typeof labeler === 'object' &&
      typeof labeler.labeler_name === 'string'
    );
  }

  create(labelerData) {
    const labelers = this.readData();

    const existingLabeler = labelers.find(l =>
      l.labeler_name?.toLowerCase() === labelerData.labeler_name?.toLowerCase()
    );

    if (existingLabeler) {
      throw new Error(`Labeler with name '${labelerData.labeler_name}' already exists`);
    }

    const newLabeler = {
      ...labelerData,
      id: labelerData.id || this.generateId(),
      address: labelerData.address || null,
      city: labelerData.city || null,
      state: labelerData.state || null,
      zipCode: labelerData.zipCode || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    labelers.push(newLabeler);
    this.writeData(labelers);
    return newLabeler;
  }

  findByName(labelerName) {
    const labelers = this.readData();
    return labelers.find(labeler =>
      labeler.labeler_name?.toLowerCase() === labelerName.toLowerCase()
    ) || null;
  }

  findByNameExact(labelerName) {
    const labelers = this.readData();
    return labelers.find(labeler => labeler.labeler_name === labelerName) || null;
  }

  updateByName(labelerName, updates) {
    const labelers = this.readData();
    const labelerIndex = labelers.findIndex(labeler =>
      labeler.labeler_name?.toLowerCase() === labelerName.toLowerCase()
    );

    if (labelerIndex === -1) {
      throw new Error(`Labeler with name '${labelerName}' not found`);
    }

    if (updates.labeler_name && updates.labeler_name !== labelers[labelerIndex].labeler_name) {
      const existingLabeler = labelers.find(l =>
        l.labeler_name?.toLowerCase() === updates.labeler_name?.toLowerCase() &&
        l.id !== labelers[labelerIndex].id
      );

      if (existingLabeler) {
        throw new Error(`Another labeler with name '${updates.labeler_name}' already exists`);
      }
    }

    labelers[labelerIndex] = {
      ...labelers[labelerIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.writeData(labelers);
    return labelers[labelerIndex];
  }

  deleteByName(labelerName) {
    const labelers = this.readData();
    const labelerIndex = labelers.findIndex(labeler =>
      labeler.labeler_name?.toLowerCase() === labelerName.toLowerCase()
    );

    if (labelerIndex === -1) {
      throw new Error(`Labeler with name '${labelerName}' not found`);
    }

    const deletedLabeler = labelers.splice(labelerIndex, 1)[0];
    this.writeData(labelers);
    return deletedLabeler;
  }

  search(query) {
    const labelers = this.readData();
    const searchTerm = query.toLowerCase();

    return labelers.filter(labeler =>
      labeler.labeler_name?.toLowerCase().includes(searchTerm) ||
      labeler.labeler_code?.toLowerCase().includes(searchTerm) ||
      labeler.address?.toLowerCase().includes(searchTerm) ||
      labeler.city?.toLowerCase().includes(searchTerm) ||
      labeler.state?.toLowerCase().includes(searchTerm) ||
      labeler.zip_code?.includes(searchTerm)
    );
  }

  searchByNamePattern(pattern) {
    const labelers = this.readData();
    const regex = new RegExp(pattern, 'i');

    return labelers.filter(labeler => regex.test(labeler.labeler_name));
  }

  findByState(state) {
    const labelers = this.readData();
    return labelers.filter(labeler =>
      labeler.state?.toLowerCase() === state.toLowerCase()
    );
  }

  findByZipCode(zipCode) {
    const labelers = this.readData();
    return labelers.filter(labeler => labeler.zip_code === zipCode);
  }

  findByLabelerCode(labelerCode) {
    const labelers = this.readData();
    return labelers.find(labeler =>
      labeler.labeler_code?.toLowerCase() === labelerCode.toLowerCase()
    ) || null;
  }

  upsert(labelerData) {
    const existingLabeler = this.findByName(labelerData.labeler_name);

    if (existingLabeler) {
      return this.updateByName(labelerData.labeler_name, labelerData);
    } else {
      return this.create(labelerData);
    }
  }

  validateLabeler(labelerData) {
    if (!labelerData.labeler_name || typeof labelerData.labeler_name !== 'string') {
      throw new Error('labeler_name is required and must be a string');
    }

    if (labelerData.labeler_code && typeof labelerData.labeler_code !== 'string') {
      throw new Error('labeler_code must be a string');
    }

    if (labelerData.zip_code && !/^\d{5}(-\d{4})?$/.test(labelerData.zip_code)) {
      throw new Error('zip_code must be in format 12345 or 12345-6789');
    }

    return true;
  }

  createValidated(labelerData) {
    this.validateLabeler(labelerData);
    return this.create(labelerData);
  }

  updateValidated(labelerName, updates) {
    if (Object.keys(updates).length > 0) {
      const currentLabeler = this.findByName(labelerName);
      if (!currentLabeler) {
        throw new Error(`Labeler with name '${labelerName}' not found`);
      }

      const updatedLabeler = { ...currentLabeler, ...updates };
      this.validateLabeler(updatedLabeler);
    }

    return this.updateByName(labelerName, updates);
  }

  getAllUniqueStates() {
    const labelers = this.readData();
    const states = labelers
      .map(labeler => labeler.state)
      .filter(state => state && typeof state === 'string')
      .map(state => state.toUpperCase());

    return [...new Set(states)].sort();
  }

  getAllUniqueZipCodes() {
    const labelers = this.readData();
    const zipCodes = labelers
      .map(labeler => labeler.zip_code)
      .filter(zip => zip && typeof zip === 'string');

    return [...new Set(zipCodes)].sort();
  }

  getStatistics() {
    const labelers = this.readData();

    const stateBreakdown = labelers.reduce((breakdown, labeler) => {
      const state = labeler.state || 'Unknown';
      breakdown[state] = (breakdown[state] || 0) + 1;
      return breakdown;
    }, {});

    const recentLabelers = labelers.filter(labeler => {
      if (!labeler.createdAt) return false;
      const createdDate = new Date(labeler.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    });

    return {
      totalLabelers: labelers.length,
      stateBreakdown,
      recentlyAdded: recentLabelers.length,
      topStates: Object.entries(stateBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([state, count]) => ({ state, count }))
    };
  }

  exportToCSV() {
    const labelers = this.readData();

    if (labelers.length === 0) {
      return 'No labelers to export';
    }

    const headers = ['ID', 'Labeler Name', 'Labeler Code', 'Address', 'City', 'State', 'Zip Code', 'Created At', 'Updated At'];
    const csvRows = [headers.join(',')];

    labelers.forEach(labeler => {
      const row = [
        labeler.id || '',
        `"${labeler.labeler_name || ''}"`,
        labeler.labeler_code || '',
        `"${labeler.address || ''}"`,
        labeler.city || '',
        labeler.state || '',
        labeler.zip_code || '',
        labeler.createdAt || '',
        labeler.updatedAt || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  importFromCSV(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const importedLabelers = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const labelerData = {};

        headers.forEach((header, index) => {
          if (values[index]) {
            switch (header.toLowerCase()) {
              case 'labeler name':
                labelerData.labeler_name = values[index];
                break;
              case 'labeler code':
                labelerData.labeler_code = values[index];
                break;
              case 'address':
                labelerData.address = values[index];
                break;
              case 'city':
                labelerData.city = values[index];
                break;
              case 'state':
                labelerData.state = values[index];
                break;
              case 'zip code':
                labelerData.zip_code = values[index];
                break;
            }
          }
        });

        if (labelerData.labeler_name) {
          const createdLabeler = this.upsert(labelerData);
          importedLabelers.push(createdLabeler);
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return {
      imported: importedLabelers.length,
      errors: errors.length,
      errorDetails: errors
    };
  }
}

module.exports = LabelerRepository;