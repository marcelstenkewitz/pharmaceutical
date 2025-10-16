const BaseRepository = require('./base/BaseRepository');

class ManufacturerRepository extends BaseRepository {
  constructor(dataDir) {
    super('manufacturers.json', dataDir);
  }

  getDefaultData() {
    // Return default manufacturers to seed the database on first run
    return [
      {
        id: "mck001",
        name: "McKesson Corporation",
        address: "6555 State Highway 161",
        city: "Irving",
        state: "TX",
        zipCode: "75039",
        phone: "1-800-625-2273",
        website: "www.mckesson.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "car001",
        name: "Cardinal Health",
        address: "7000 Cardinal Place",
        city: "Dublin",
        state: "OH",
        zipCode: "43017",
        phone: "1-800-234-8701",
        website: "www.cardinalhealth.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "abc001",
        name: "AmerisourceBergen",
        address: "1 West First Avenue",
        city: "Conshohocken",
        state: "PA",
        zipCode: "19428",
        phone: "1-800-829-3132",
        website: "www.amerisourcebergen.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "mor001",
        name: "Morris & Dickson Co.",
        address: "4800 T.L. James Drive",
        city: "Shreveport",
        state: "LA",
        zipCode: "71109",
        phone: "1-800-289-2664",
        website: "www.mdco.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "hda001",
        name: "HD Smith Wholesale Drug Co.",
        address: "3001 N Rocky Point Dr",
        city: "Tampa",
        state: "FL",
        zipCode: "33607",
        phone: "1-800-654-9326",
        website: "www.hdsmith.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "rxc001",
        name: "Rochester Drug Cooperative",
        address: "1 RDC Plaza",
        city: "Rochester",
        state: "NY",
        zipCode: "14623",
        phone: "1-800-462-7732",
        website: "www.rdcrx.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  validateData(data) {
    if (!Array.isArray(data)) return false;

    return data.every(manufacturer =>
      manufacturer &&
      typeof manufacturer === 'object' &&
      typeof manufacturer.name === 'string'
    );
  }

  create(manufacturerData) {
    const manufacturers = this.readData();

    const existingManufacturer = manufacturers.find(m =>
      m.name?.toLowerCase() === manufacturerData.name?.toLowerCase()
    );

    if (existingManufacturer) {
      throw new Error(`Manufacturer with name '${manufacturerData.name}' already exists`);
    }

    const newManufacturer = {
      ...manufacturerData,
      id: manufacturerData.id || this.generateId(),
      address: manufacturerData.address || null,
      city: manufacturerData.city || null,
      state: manufacturerData.state || null,
      zipCode: manufacturerData.zipCode || null,
      phone: manufacturerData.phone || null,
      website: manufacturerData.website || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    manufacturers.push(newManufacturer);
    this.writeData(manufacturers);
    return newManufacturer;
  }

  findByName(manufacturerName) {
    const manufacturers = this.readData();
    return manufacturers.find(manufacturer =>
      manufacturer.name?.toLowerCase() === manufacturerName.toLowerCase()
    ) || null;
  }

  findByNameExact(manufacturerName) {
    const manufacturers = this.readData();
    return manufacturers.find(manufacturer => manufacturer.name === manufacturerName) || null;
  }

  updateByName(manufacturerName, updates) {
    const manufacturers = this.readData();
    const manufacturerIndex = manufacturers.findIndex(manufacturer =>
      manufacturer.name?.toLowerCase() === manufacturerName.toLowerCase()
    );

    if (manufacturerIndex === -1) {
      throw new Error(`Manufacturer with name '${manufacturerName}' not found`);
    }

    if (updates.name && updates.name !== manufacturers[manufacturerIndex].name) {
      const existingManufacturer = manufacturers.find(m =>
        m.name?.toLowerCase() === updates.name?.toLowerCase() &&
        m.id !== manufacturers[manufacturerIndex].id
      );

      if (existingManufacturer) {
        throw new Error(`Another manufacturer with name '${updates.name}' already exists`);
      }
    }

    manufacturers[manufacturerIndex] = {
      ...manufacturers[manufacturerIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.writeData(manufacturers);
    return manufacturers[manufacturerIndex];
  }

  deleteByName(manufacturerName) {
    const manufacturers = this.readData();
    const manufacturerIndex = manufacturers.findIndex(manufacturer =>
      manufacturer.name?.toLowerCase() === manufacturerName.toLowerCase()
    );

    if (manufacturerIndex === -1) {
      throw new Error(`Manufacturer with name '${manufacturerName}' not found`);
    }

    const deletedManufacturer = manufacturers.splice(manufacturerIndex, 1)[0];
    this.writeData(manufacturers);
    return deletedManufacturer;
  }

  search(query) {
    const manufacturers = this.readData();
    const searchTerm = query.toLowerCase();

    return manufacturers.filter(manufacturer =>
      manufacturer.name?.toLowerCase().includes(searchTerm) ||
      manufacturer.address?.toLowerCase().includes(searchTerm) ||
      manufacturer.city?.toLowerCase().includes(searchTerm) ||
      manufacturer.state?.toLowerCase().includes(searchTerm) ||
      manufacturer.zipCode?.includes(searchTerm) ||
      manufacturer.phone?.includes(searchTerm)
    );
  }

  findByState(state) {
    const manufacturers = this.readData();
    return manufacturers.filter(manufacturer =>
      manufacturer.state?.toLowerCase() === state.toLowerCase()
    );
  }

  upsert(manufacturerData) {
    const existingManufacturer = this.findByName(manufacturerData.name);

    if (existingManufacturer) {
      return this.updateByName(manufacturerData.name, manufacturerData);
    } else {
      return this.create(manufacturerData);
    }
  }

  validateManufacturer(manufacturerData) {
    if (!manufacturerData.name || typeof manufacturerData.name !== 'string') {
      throw new Error('name is required and must be a string');
    }

    if (manufacturerData.zipCode && !/^\d{5}(-\d{4})?$/.test(manufacturerData.zipCode)) {
      throw new Error('zipCode must be in format 12345 or 12345-6789');
    }

    return true;
  }

  createValidated(manufacturerData) {
    this.validateManufacturer(manufacturerData);
    return this.create(manufacturerData);
  }

  updateValidated(manufacturerName, updates) {
    if (Object.keys(updates).length > 0) {
      const currentManufacturer = this.findByName(manufacturerName);
      if (!currentManufacturer) {
        throw new Error(`Manufacturer with name '${manufacturerName}' not found`);
      }

      const updatedManufacturer = { ...currentManufacturer, ...updates };
      this.validateManufacturer(updatedManufacturer);
    }

    return this.updateByName(manufacturerName, updates);
  }
}

module.exports = ManufacturerRepository;
