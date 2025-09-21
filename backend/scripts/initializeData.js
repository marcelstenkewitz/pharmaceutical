#!/usr/bin/env node

/**
 * Data Initialization Script for Render.com Deployment
 * Conditionally seeds data only if the persistent disk is empty
 */

const fs = require('fs');
const path = require('path');
const { seedMockData } = require('./seedMockData');

// Determine data directory based on environment (to match server.js)
const isProduction = process.env.NODE_ENV === 'production' ||
                    process.env.RENDER === 'true' ||
                    fs.existsSync(path.join(__dirname, '..', 'public', 'index.html'));

const dataDir = isProduction ? '/app/data' : path.join(__dirname, '..', 'storage');

console.log('🚀 Initializing pharmaceutical tracking system data...');
console.log(`📁 Data directory: ${dataDir}`);
console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);

async function initializeData() {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      console.log('📁 Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Check if any data files exist
    const dataFiles = [
      path.join(dataDir, 'clients.json'),
      path.join(dataDir, 'reports.json'),
      path.join(dataDir, 'manual-entries.json'),
      path.join(dataDir, 'labelers.json')
    ];

    const existingFiles = dataFiles.filter(file => fs.existsSync(file));

    if (existingFiles.length > 0) {
      console.log('✅ Data files already exist:');
      existingFiles.forEach(file => {
        const stats = fs.statSync(file);
        console.log(`   • ${path.basename(file)} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`);
      });
      console.log('🎯 Data initialization complete - using existing data');
      return true;
    }

    console.log('📦 No existing data found - seeding mock data...');
    const success = await seedMockData(false); // Don't force in initialization

    if (success) {
      console.log('✨ Data initialization complete - mock data seeded successfully');
      return true;
    } else {
      console.log('⚠️  Data initialization skipped - no data seeded');
      return false;
    }

  } catch (error) {
    console.error('❌ Error during data initialization:', error);

    // In production, we should not fail the deployment due to seeding issues
    if (isProduction) {
      console.log('🛡️  Production mode: continuing without seeded data');
      return false;
    } else {
      throw error;
    }
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeData()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Fatal error during initialization:', error);
      process.exit(1);
    });
}

module.exports = { initializeData };