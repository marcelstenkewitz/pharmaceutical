const fs = require('fs');
const path = require('path');

const CLIENTS_FILE = path.join(__dirname, 'clients.json');

function migrateClientData() {
  try {
    const clientsData = fs.readFileSync(CLIENTS_FILE, 'utf8');
    const clients = JSON.parse(clientsData);
    
    console.log('Migrating client data structure...');
    
    clients.forEach(client => {
      if (client.reports && Array.isArray(client.reports)) {
        // Check if reports are in old format (individual line items)
        const hasOldFormat = client.reports.some(report => 
          report.lineNo !== undefined && !report.lineItems
        );
        
        if (hasOldFormat) {
          console.log(`Migrating client: ${client.businessName || client.name}`);
          
          // Group old line items into a single report
          const oldLineItems = client.reports.filter(item => 
            item.lineNo !== undefined && !item.lineItems
          );
          
          if (oldLineItems.length > 0) {
            // Create a new report structure
            const migratedReport = {
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
              createdAt: oldLineItems[0].createdAt || new Date().toISOString(),
              lineItems: oldLineItems.map(item => ({
                ...item,
                // Remove createdAt from line items since it belongs to the report
                // Keep the other fields as they are
              }))
            };
            
            // Replace the old reports structure with the new one
            client.reports = [migratedReport];
            
            console.log(`Migrated ${oldLineItems.length} line items into 1 report for ${client.businessName || client.name}`);
          }
        }
      }
    });
    
    // Write back the migrated data
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf8');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateClientData();
