/**
 * Data Migration Utilities
 *
 * Handles automatic data structure migrations for the pharmaceutical tracking system.
 * Migrations run automatically when old data structures are detected.
 */

/**
 * Get intelligent default values for wholesaler, wholesalerAccountNumber, and invoicePercentage
 * Based on business name, location, or universal defaults
 *
 * @param {Object} client - Client object
 * @returns {Object} - { wholesaler, wholesalerAccountNumber, wholesalerAddress, invoicePercentage }
 */
function getWholesalerDefaults(client) {
  // Known client mappings
  const knownClients = {
    'Sunrise Medical Center': {
      wholesaler: 'McKesson Corporation',
      wholesalerAccountNumber: 'MCK-LA-12345',
      wholesalerAddress: '8741 Landmark Rd, Richmond, VA 23261',
      invoicePercentage: 15
    },
    'Pacific Coast Pharmacy': {
      wholesaler: 'Cardinal Health',
      wholesalerAccountNumber: 'CAR-SF-67890',
      wholesalerAddress: '7000 Cardinal Pl, Dublin, OH 43017',
      invoicePercentage: 20
    },
    'Central Valley Hospital': {
      wholesaler: 'AmerisourceBergen',
      wholesalerAccountNumber: 'ABC-FR-11111',
      wholesalerAddress: '1 W 1st Ave, Conshohocken, PA 19428',
      invoicePercentage: 25
    }
  };

  // Check if this is a known client
  if (client.businessName && knownClients[client.businessName]) {
    return knownClients[client.businessName];
  }

  // Generate smart defaults for unknown clients
  const state = client.state || 'XX';
  const cityCode = (client.city || 'UNK').substring(0, 2).toUpperCase();
  const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();

  return {
    wholesaler: 'McKesson Corporation',
    wholesalerAccountNumber: `MCK-${state}-${cityCode}${randomId}`,
    wholesalerAddress: '',
    invoicePercentage: 15
  };
}

/**
 * Migrate client data from old structure to new structure
 *
 * Migration handles:
 * - Rename 'manufacturer' field to 'wholesaler'
 * - Rename 'accountNumber' field to 'wholesalerAccountNumber'
 * - Add 'wholesalerAddress' field
 * - Ensure DEA fields exist (deaNumber, deaExpirationDate)
 * - Ensure stateLicenseExpirationDate exists
 * - Missing wholesaler, wholesalerAccountNumber, invoicePercentage fields
 * - Missing or mismatched 'name' field
 *
 * @param {Array} clients - Array of client objects
 * @returns {Object} - { migrated: boolean, clients: Array, changes: Array }
 */
function migrateClients(clients) {
  if (!Array.isArray(clients)) {
    console.warn('[Migration] Invalid clients data - not an array');
    return { migrated: false, clients, changes: [] };
  }

  let needsMigration = false;
  const changes = [];

  const migratedClients = clients.map(client => {
    const clientChanges = [];
    const migratedClient = { ...client };

    // Migrate 'manufacturer' field to 'wholesaler'
    if (migratedClient.manufacturer !== undefined && migratedClient.wholesaler === undefined) {
      migratedClient.wholesaler = migratedClient.manufacturer;
      delete migratedClient.manufacturer;
      clientChanges.push(`Renamed manufacturer to wholesaler: "${migratedClient.wholesaler}"`);
      needsMigration = true;
    }

    // Migrate 'accountNumber' field to 'wholesalerAccountNumber'
    if (migratedClient.accountNumber !== undefined && migratedClient.wholesalerAccountNumber === undefined) {
      migratedClient.wholesalerAccountNumber = migratedClient.accountNumber;
      delete migratedClient.accountNumber;
      clientChanges.push(`Renamed accountNumber to wholesalerAccountNumber: "${migratedClient.wholesalerAccountNumber}"`);
      needsMigration = true;
    }

    // Ensure DEA fields exist
    if (migratedClient.deaNumber === undefined) {
      migratedClient.deaNumber = null;
      clientChanges.push('Added deaNumber field (null)');
      needsMigration = true;
    }

    if (migratedClient.deaExpirationDate === undefined) {
      migratedClient.deaExpirationDate = null;
      clientChanges.push('Added deaExpirationDate field (null)');
      needsMigration = true;
    }

    // Ensure state license expiration exists
    if (migratedClient.stateLicenseExpirationDate === undefined) {
      migratedClient.stateLicenseExpirationDate = null;
      clientChanges.push('Added stateLicenseExpirationDate field (null)');
      needsMigration = true;
    }

    // Ensure wholesaler fields exist with intelligent defaults
    // Handle both undefined AND null values (from previous migrations)
    // Get defaults once to ensure consistency across all fields
    const needsWholesalerDefaults =
      migratedClient.wholesaler === undefined || migratedClient.wholesaler === null ||
      migratedClient.wholesalerAccountNumber === undefined || migratedClient.wholesalerAccountNumber === null ||
      migratedClient.wholesalerAddress === undefined ||
      migratedClient.invoicePercentage === undefined || migratedClient.invoicePercentage === null;

    if (needsWholesalerDefaults) {
      const defaults = getWholesalerDefaults(migratedClient);

      if (migratedClient.wholesaler === undefined || migratedClient.wholesaler === null) {
        migratedClient.wholesaler = defaults.wholesaler;
        clientChanges.push(`Set wholesaler to: "${defaults.wholesaler}"`);
        needsMigration = true;
      }

      if (migratedClient.wholesalerAccountNumber === undefined || migratedClient.wholesalerAccountNumber === null) {
        migratedClient.wholesalerAccountNumber = defaults.wholesalerAccountNumber;
        clientChanges.push(`Set wholesalerAccountNumber to: "${defaults.wholesalerAccountNumber}"`);
        needsMigration = true;
      }

      if (migratedClient.wholesalerAddress === undefined) {
        migratedClient.wholesalerAddress = defaults.wholesalerAddress || '';
        if (defaults.wholesalerAddress) {
          clientChanges.push(`Set wholesalerAddress to: "${defaults.wholesalerAddress}"`);
        } else {
          clientChanges.push('Added wholesalerAddress field (empty)');
        }
        needsMigration = true;
      }

      if (migratedClient.invoicePercentage === undefined || migratedClient.invoicePercentage === null) {
        migratedClient.invoicePercentage = defaults.invoicePercentage;
        clientChanges.push(`Set invoicePercentage to: ${defaults.invoicePercentage}%`);
        needsMigration = true;
      }
    }

    // Ensure 'name' field matches 'businessName'
    if (migratedClient.businessName && migratedClient.name !== migratedClient.businessName) {
      migratedClient.name = migratedClient.businessName;
      clientChanges.push(`Set name field to match businessName: "${migratedClient.businessName}"`);
      needsMigration = true;
    }

    // Ensure stateLicenseNumber exists
    if (migratedClient.stateLicenseNumber === undefined) {
      migratedClient.stateLicenseNumber = null;
      clientChanges.push('Added stateLicenseNumber field (null)');
      needsMigration = true;
    }

    // Track changes for this client
    if (clientChanges.length > 0) {
      changes.push({
        clientId: client.id,
        businessName: client.businessName,
        changes: clientChanges
      });
    }

    return migratedClient;
  });

  return {
    migrated: needsMigration,
    clients: migratedClients,
    changes
  };
}

/**
 * Log migration results in a formatted way
 *
 * @param {string} dataType - Type of data being migrated (e.g., 'clients')
 * @param {Object} result - Migration result from migration function
 */
function logMigrationResult(dataType, result) {
  if (!result.migrated) {
    console.log(`[Migration] No ${dataType} migration needed - data structure is current`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Migration] ${dataType.toUpperCase()} DATA MIGRATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total records migrated: ${result.changes.length}`);

  if (result.changes.length > 0) {
    console.log(`\nDetailed changes:`);
    result.changes.forEach((change, index) => {
      console.log(`\n${index + 1}. Client: ${change.businessName} (ID: ${change.clientId})`);
      change.changes.forEach(changeDesc => {
        console.log(`   - ${changeDesc}`);
      });
    });
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

module.exports = {
  migrateClients,
  logMigrationResult
};
