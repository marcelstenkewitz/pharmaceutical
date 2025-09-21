const fs = require('fs');
const path = require('path');

class BaseRepository {
  constructor(filename, dataDir) {
    this.filename = filename;
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, filename);
    this.backupPath = path.join(dataDir, `${filename}.backup`);

    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        console.log(`Creating data directory: ${this.dataDir}`);
        fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o755 });
      }
    } catch (error) {
      console.error(`Failed to create data directory: ${this.dataDir}`, error);
      throw new Error(`Cannot create data directory: ${error.message}`);
    }
  }

  createBackup() {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.copyFileSync(this.filePath, this.backupPath);
        console.log(`Backup created: ${this.backupPath}`);
      }
    } catch (error) {
      console.warn(`Failed to create backup for ${this.filename}:`, error.message);
    }
  }

  restoreFromBackup() {
    try {
      if (fs.existsSync(this.backupPath)) {
        fs.copyFileSync(this.backupPath, this.filePath);
        console.log(`Restored from backup: ${this.backupPath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to restore from backup for ${this.filename}:`, error.message);
      return false;
    }
  }

  readData() {
    try {
      if (!fs.existsSync(this.filePath)) {
        console.log(`File ${this.filename} does not exist, returning default data`);
        return this.getDefaultData();
      }

      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      return this.validateData(parsed) ? parsed : this.getDefaultData();
    } catch (error) {
      console.error(`Error reading ${this.filename}:`, error.message);
      console.log(`Attempting to restore from backup...`);

      if (this.restoreFromBackup()) {
        try {
          const data = fs.readFileSync(this.filePath, 'utf8');
          const parsed = JSON.parse(data);
          return this.validateData(parsed) ? parsed : this.getDefaultData();
        } catch (backupError) {
          console.error(`Backup also corrupted for ${this.filename}:`, backupError.message);
        }
      }

      console.log(`Returning default data for ${this.filename}`);
      return this.getDefaultData();
    }
  }

  writeData(data) {
    try {
      if (!this.validateData(data)) {
        throw new Error(`Invalid data structure for ${this.filename}`);
      }

      this.createBackup();

      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filePath, jsonString, 'utf8');
      console.log(`Successfully wrote data to: ${this.filePath}`);

      return true;
    } catch (error) {
      console.error(`Error writing ${this.filename}:`, error.message);

      console.log(`Attempting to restore from backup...`);
      if (this.restoreFromBackup()) {
        console.log(`Restored ${this.filename} from backup after write failure`);
      }

      throw new Error(`Failed to save data to ${this.filename}: ${error.message}`);
    }
  }

  findAll() {
    return this.readData();
  }

  findById(id) {
    const data = this.readData();
    if (Array.isArray(data)) {
      return data.find(item => item.id === id) || null;
    }
    return data[id] || null;
  }

  exists(id) {
    return this.findById(id) !== null;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  getDefaultData() {
    return [];
  }

  validateData(data) {
    return data !== null && data !== undefined;
  }

  create(item) {
    const data = this.readData();
    const newItem = {
      ...item,
      id: item.id || this.generateId(),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (Array.isArray(data)) {
      data.push(newItem);
    } else {
      data[newItem.id] = newItem;
    }

    this.writeData(data);
    return newItem;
  }

  update(id, updates) {
    const data = this.readData();
    let found = false;

    if (Array.isArray(data)) {
      const index = data.findIndex(item => item.id === id);
      if (index !== -1) {
        data[index] = {
          ...data[index],
          ...updates,
          id,
          updatedAt: new Date().toISOString()
        };
        found = true;
      }
    } else {
      if (data[id]) {
        data[id] = {
          ...data[id],
          ...updates,
          id,
          updatedAt: new Date().toISOString()
        };
        found = true;
      }
    }

    if (!found) {
      throw new Error(`Item with id ${id} not found in ${this.filename}`);
    }

    this.writeData(data);
    return Array.isArray(data) ? data.find(item => item.id === id) : data[id];
  }

  delete(id) {
    const data = this.readData();
    let found = false;
    let deletedItem = null;

    if (Array.isArray(data)) {
      const index = data.findIndex(item => item.id === id);
      if (index !== -1) {
        deletedItem = data[index];
        data.splice(index, 1);
        found = true;
      }
    } else {
      if (data[id]) {
        deletedItem = data[id];
        delete data[id];
        found = true;
      }
    }

    if (!found) {
      throw new Error(`Item with id ${id} not found in ${this.filename}`);
    }

    this.writeData(data);
    return deletedItem;
  }

  count() {
    const data = this.readData();
    return Array.isArray(data) ? data.length : Object.keys(data).length;
  }

  clear() {
    this.writeData(this.getDefaultData());
  }
}

module.exports = BaseRepository;