#!/usr/bin/env node

/**
 * Mock Data Seeding Script for Pharmaceutical Tracking System
 * Creates realistic test data with proper pricing structure
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Determine data directory based on environment (to match server.js)
const isProduction = process.env.NODE_ENV === 'production' ||
                    process.env.RENDER === 'true' ||
                    fs.existsSync(path.join(__dirname, '..', 'public', 'index.html'));

const dataDir = isProduction ? '/app/data' : path.join(__dirname, '..', 'storage');

console.log(`🌱 Environment: ${isProduction ? 'production' : 'development'}`);
console.log(`📁 Data directory: ${dataDir}`);

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 15);
const generateUUID = () => crypto.randomUUID();

// Parse package size to extract units per package
function parsePackageSize(packageSize) {
  const match = packageSize.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (!match) return { count: 1, unit: 'units' };

  const [, count, unit] = match;
  return {
    count: parseFloat(count),
    unit: unit.toLowerCase()
  };
}

// Calculate pricing fields
function calculatePricing(pricePerUnit, packageSize, packages) {
  const parsed = parsePackageSize(packageSize);
  const unitsPerPackage = parsed.count;
  const pricePerPackage = pricePerUnit * unitsPerPackage;
  const totalPrice = pricePerPackage * packages;

  return {
    pricePerUnit,
    pricingUnit: 'EA',
    unitsPerPackage,
    packageUnit: parsed.unit,
    pricePerPackage,
    totalPrice
  };
}

// Mock pharmaceutical data with realistic NDCs and pricing
const mockDrugs = [
  {
    ndc11: '00406035705', // Real NDC for testing
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '100 tablets',
    labeler_name: 'Mallinckrodt Pharmaceuticals',
    dea_schedule: 'CII',
    pricePerUnit: 0.89
  },
  {
    ndc11: '00781108901', // Real NDC
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '100 tablets',
    labeler_name: 'Sandoz Inc',
    dea_schedule: 'CIV',
    pricePerUnit: 0.04204
  },
  {
    ndc11: '00228402211', // Real NDC
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '100 tablets',
    labeler_name: 'Actavis Pharma, Inc.',
    dea_schedule: 'CIV',
    pricePerUnit: 0.15652
  },
  {
    ndc11: '00574705050',
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '5 patches',
    labeler_name: 'Mallinckrodt Pharmaceuticals',
    dea_schedule: 'CII',
    pricePerUnit: 31.38
  },
  {
    ndc11: '00409123401',
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '10 mL',
    labeler_name: 'Hospira Inc',
    dea_schedule: 'CIV',
    pricePerUnit: 1.75
  },
  {
    ndc11: '00781543330',
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '30 tablets',
    labeler_name: 'Sandoz Inc',
    dea_schedule: 'CII',
    pricePerUnit: 0.95
  },
  {
    ndc11: '00406882562',
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '100 tablets',
    labeler_name: 'Mallinckrodt Pharmaceuticals',
    dea_schedule: 'CII',
    pricePerUnit: 1.25
  },
  {
    ndc11: '00904657061',
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '100 tablets',
    labeler_name: 'Major Pharmaceuticals',
    dea_schedule: 'CIII',
    pricePerUnit: 0.32
  },
  {
    ndc11: '00591023105',
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '30 tablets',
    labeler_name: 'Actavis Pharma',
    dea_schedule: 'CIV',
    pricePerUnit: 0.18
  },
  {
    ndc11: '00378060110',
    itemName: 'DEMO DRUG - FAKE NAME',
    packageSize: '100 tablets',
    labeler_name: 'Mylan Pharmaceuticals',
    dea_schedule: 'CII',
    pricePerUnit: 0.67
  }
];

// Mock clients
const mockClients = [
  {
    id: generateId(),
    name: 'Dr. Sarah Johnson',
    businessName: 'Sunrise Medical Center',
    deaNumber: 'BJ1234567',
    streetAddress: '123 Medical Plaza Dr',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210',
    phoneNumber: '(555) 123-4567',
    reports: []
  },
  {
    id: generateId(),
    name: 'Dr. Michael Chen',
    businessName: 'Pacific Coast Pharmacy',
    deaNumber: 'BC9876543',
    streetAddress: '456 Harbor Blvd',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    phoneNumber: '(555) 987-6543',
    reports: []
  },
  {
    id: generateId(),
    name: 'Dr. Emily Rodriguez',
    businessName: 'Central Valley Hospital',
    deaNumber: 'BR5555555',
    streetAddress: '789 Valley Way',
    city: 'Fresno',
    state: 'CA',
    zipCode: '93720',
    phoneNumber: '(555) 555-5555',
    reports: []
  }
];

// Mock labelers with return instructions that match the pharmaceutical companies in mockDrugs
const mockLabelers = [
  {
    labeler_name: 'Mallinckrodt Pharmaceuticals',
    return_instructions: 'Contact Mallinckrodt Returns Department at 1-800-778-7898 for return authorization. All controlled substances must be pre-approved.',
    updatedAt: new Date().toISOString()
  },
  {
    labeler_name: 'Sandoz Inc',
    return_instructions: 'Returns must be pre-authorized. Call 1-800-525-8747 or email returns@sandoz.com for authorization.',
    updatedAt: new Date().toISOString()
  },
  {
    labeler_name: 'Actavis Pharma, Inc.',
    return_instructions: 'Contact Actavis Returns at 1-800-272-5525. Online returns portal available. Returns must be within 12 months of expiration.',
    updatedAt: new Date().toISOString()
  },
  {
    labeler_name: 'Hospira Inc',
    return_instructions: 'Use Pfizer Returns Service (Hospira is now part of Pfizer). Contact 1-800-879-3477 for authorization.',
    updatedAt: new Date().toISOString()
  },
  {
    labeler_name: 'Major Pharmaceuticals',
    return_instructions: 'Contact Major Pharmaceuticals Returns Department at 1-800-616-2471. Return authorization required for all products.',
    updatedAt: new Date().toISOString()
  },
  {
    labeler_name: 'Actavis Pharma',
    return_instructions: 'Contact Actavis Returns at 1-800-272-5525. Returns must be authorized within 90 days of expiration date.',
    updatedAt: new Date().toISOString()
  },
  {
    labeler_name: 'Mylan Pharmaceuticals',
    return_instructions: 'Now part of Viatris. Contact Viatris Returns at 1-877-446-3679 or use online returns portal at viatris.com/returns.',
    updatedAt: new Date().toISOString()
  }
];

// Generate mock reports with line items
function generateMockReports() {
  const reports = [];

  mockClients.forEach((client, clientIndex) => {
    // Generate 2-3 reports per client
    const numReports = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < numReports; i++) {
      const reportId = generateUUID();
      const numItems = Math.floor(Math.random() * 5) + 2; // 2-6 items per report
      const lineItems = [];

      for (let j = 0; j < numItems; j++) {
        const drug = mockDrugs[Math.floor(Math.random() * mockDrugs.length)];
        const packages = Math.floor(Math.random() * 3) + 1; // 1-3 packages
        const pricing = calculatePricing(drug.pricePerUnit, drug.packageSize, packages);

        lineItems.push({
          id: generateId(),
          lineNo: j + 1,
          itemName: drug.itemName,
          ndc11: drug.ndc11,
          packageSize: drug.packageSize,
          packages,
          labeler_name: drug.labeler_name,
          dea_schedule: drug.dea_schedule,
          ...pricing
        });
      }

      const report = {
        id: reportId,
        clientId: client.id,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 30 days
        lineItems
      };

      reports.push(report);
      client.reports.push(reportId);
    }
  });

  return reports;
}

// Main seeding function
async function seedMockData(force = false) {
  console.log('🌱 Seeding mock data for pharmaceutical tracking system...');

  try {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    // Check if data already exists (safety check for production)
    const clientsFile = path.join(dataDir, 'clients.json');
    const reportsFile = path.join(dataDir, 'reports.json');
    const manualEntriesFile = path.join(dataDir, 'manual-entries.json');

    const hasExistingData = fs.existsSync(clientsFile) || fs.existsSync(reportsFile);

    if (hasExistingData && !force && isProduction) {
      console.log('⚠️  Existing data detected in production environment');
      console.log('🛡️  Skipping seed to prevent data loss');
      console.log('💡 Use --force flag to override this safety check');
      return false;
    }

    if (hasExistingData && !force) {
      console.log('⚠️  Existing data detected');
      console.log('🛡️  Skipping seed to prevent data loss');
      console.log('💡 Use --force flag to override this safety check');
      return false;
    }

    if (hasExistingData && force) {
      console.log('🔄 Force flag detected - overwriting existing data');
    }

    // Generate reports
    const reports = generateMockReports();

    // Write clients data
    fs.writeFileSync(clientsFile, JSON.stringify(mockClients, null, 2));
    console.log(`✅ Created ${mockClients.length} mock clients`);

    // Write reports data
    fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2));
    console.log(`✅ Created ${reports.length} mock reports`);

    // Create empty manual entries file
    fs.writeFileSync(manualEntriesFile, JSON.stringify([], null, 2));
    console.log('✅ Created empty manual entries file');

    // Write labelers data with matching pharmaceutical companies
    const labelersFile = path.join(dataDir, 'labelers.json');
    fs.writeFileSync(labelersFile, JSON.stringify(mockLabelers, null, 2));
    console.log(`✅ Created ${mockLabelers.length} labelers with return instructions`);

    // Summary
    console.log('\n📊 Mock Data Summary:');
    console.log(`   • ${mockClients.length} clients`);
    console.log(`   • ${reports.length} reports`);
    console.log(`   • ${reports.reduce((sum, r) => sum + r.lineItems.length, 0)} total line items`);
    console.log(`   • ${mockDrugs.length} different pharmaceutical products`);
    console.log(`   • ${mockLabelers.length} labelers with return instructions`);

    const totalValue = reports.reduce((sum, report) =>
      sum + report.lineItems.reduce((reportSum, item) => reportSum + item.totalPrice, 0), 0
    );
    console.log(`   • $${totalValue.toFixed(2)} total value across all reports`);

    console.log('\n✨ Mock data seeded successfully!');
    console.log('💡 Restart your backend server to load the new data.');
    return true;

  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  const force = process.argv.includes('--force');
  seedMockData(force);
}

module.exports = { seedMockData };