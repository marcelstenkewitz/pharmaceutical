/**
 * Data Migration Utilities
 *
 * Handles automatic data structure migrations for the pharmaceutical tracking system.
 * Migrations run automatically when old data structures are detected.
 */

/**
 * Migrate client data from old structure to new structure
 *
 * Old structure issues:
 * - Had deaNumber and deaExpirationDate fields (now removed)
 * - Missing wholesaler, accountNumber, invoicePercentage fields
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

    // Check if this client has DEA fields (old structure)
    if (migratedClient.deaNumber !== undefined) {
      delete migratedClient.deaNumber;
      clientChanges.push('Removed deaNumber field');
      needsMigration = true;
    }

    if (migratedClient.deaExpirationDate !== undefined) {
      delete migratedClient.deaExpirationDate;
      clientChanges.push('Removed deaExpirationDate field');
      needsMigration = true;
    }

    // Ensure wholesaler fields exist (set to null if missing)
    if (migratedClient.wholesaler === undefined) {
      migratedClient.wholesaler = null;
      clientChanges.push('Added wholesaler field (null)');
      needsMigration = true;
    }

    if (migratedClient.accountNumber === undefined) {
      migratedClient.accountNumber = null;
      clientChanges.push('Added accountNumber field (null)');
      needsMigration = true;
    }

    if (migratedClient.invoicePercentage === undefined) {
      migratedClient.invoicePercentage = null;
      clientChanges.push('Added invoicePercentage field (null)');
      needsMigration = true;
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
