const BaseRepository = require('./base/BaseRepository');

class WholesalerRepository extends BaseRepository {
  constructor(dataDir) {
    super('wholesalers.json', dataDir);
  }

  getDefaultData() {
    return [];
  }

  validateData(data) {
    if (!Array.isArray(data)) return false;

    return data.every(wholesaler =>
      wholesaler &&
      typeof wholesaler === 'object' &&
      typeof wholesaler.name === 'string'
    );
  }

  create(wholesalerData) {
    const wholesalers = this.readData();

    const existingWholesaler = wholesalers.find(w =>
      w.name?.toLowerCase() === wholesalerData.name?.toLowerCase()
    );

    if (existingWholesaler) {
      throw new Error(`Wholesaler with name '${wholesalerData.name}' already exists`);
    }

    const newWholesaler = {
      ...wholesalerData,
      id: wholesalerData.id || this.generateId(),
      address: wholesalerData.address || null,
      city: wholesalerData.city || null,
      state: wholesalerData.state || null,
      zipCode: wholesalerData.zipCode || null,
      phone: wholesalerData.phone || null,
      website: wholesalerData.website || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    wholesalers.push(newWholesaler);
    this.writeData(wholesalers);
    return newWholesaler;
  }

  findByName(wholesalerName) {
    const wholesalers = this.readData();
    return wholesalers.find(wholesaler =>
      wholesaler.name?.toLowerCase() === wholesalerName.toLowerCase()
    ) || null;
  }

  findByNameExact(wholesalerName) {
    const wholesalers = this.readData();
    return wholesalers.find(wholesaler => wholesaler.name === wholesalerName) || null;
  }

  updateByName(wholesalerName, updates) {
    const wholesalers = this.readData();
    const wholesalerIndex = wholesalers.findIndex(wholesaler =>
      wholesaler.name?.toLowerCase() === wholesalerName.toLowerCase()
    );

    if (wholesalerIndex === -1) {
      throw new Error(`Wholesaler with name '${wholesalerName}' not found`);
    }

    if (updates.name && updates.name !== wholesalers[wholesalerIndex].name) {
      const existingWholesaler = wholesalers.find(w =>
        w.name?.toLowerCase() === updates.name?.toLowerCase() &&
        w.id !== wholesalers[wholesalerIndex].id
      );

      if (existingWholesaler) {
        throw new Error(`Another wholesaler with name '${updates.name}' already exists`);
      }
    }

    wholesalers[wholesalerIndex] = {
      ...wholesalers[wholesalerIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.writeData(wholesalers);
    return wholesalers[wholesalerIndex];
  }

  deleteByName(wholesalerName) {
    const wholesalers = this.readData();
    const wholesalerIndex = wholesalers.findIndex(wholesaler =>
      wholesaler.name?.toLowerCase() === wholesalerName.toLowerCase()
    );

    if (wholesalerIndex === -1) {
      throw new Error(`Wholesaler with name '${wholesalerName}' not found`);
    }

    const deletedWholesaler = wholesalers.splice(wholesalerIndex, 1)[0];
    this.writeData(wholesalers);
    return deletedWholesaler;
  }

  search(query) {
    const wholesalers = this.readData();
    const searchTerm = query.toLowerCase();

    return wholesalers.filter(wholesaler =>
      wholesaler.name?.toLowerCase().includes(searchTerm) ||
      wholesaler.address?.toLowerCase().includes(searchTerm) ||
      wholesaler.city?.toLowerCase().includes(searchTerm) ||
      wholesaler.state?.toLowerCase().includes(searchTerm) ||
      wholesaler.zipCode?.includes(searchTerm) ||
      wholesaler.phone?.includes(searchTerm)
    );
  }

  findByState(state) {
    const wholesalers = this.readData();
    return wholesalers.filter(wholesaler =>
      wholesaler.state?.toLowerCase() === state.toLowerCase()
    );
  }

  upsert(wholesalerData) {
    const existingWholesaler = this.findByName(wholesalerData.name);

    if (existingWholesaler) {
      return this.updateByName(wholesalerData.name, wholesalerData);
    } else {
      return this.create(wholesalerData);
    }
  }

  validateWholesaler(wholesalerData) {
    if (!wholesalerData.name || typeof wholesalerData.name !== 'string') {
      throw new Error('name is required and must be a string');
    }

    if (wholesalerData.zipCode && !/^\d{5}(-\d{4})?$/.test(wholesalerData.zipCode)) {
      throw new Error('zipCode must be in format 12345 or 12345-6789');
    }

    return true;
  }

  createValidated(wholesalerData) {
    this.validateWholesaler(wholesalerData);
    return this.create(wholesalerData);
  }

  updateValidated(wholesalerName, updates) {
    if (Object.keys(updates).length > 0) {
      const currentWholesaler = this.findByName(wholesalerName);
      if (!currentWholesaler) {
        throw new Error(`Wholesaler with name '${wholesalerName}' not found`);
      }

      const updatedWholesaler = { ...currentWholesaler, ...updates };
      this.validateWholesaler(updatedWholesaler);
    }

    return this.updateByName(wholesalerName, updates);
  }
}

module.exports = WholesalerRepository;
