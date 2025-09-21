#!/usr/bin/env node

/**
 * Production Startup Script for Render.com
 * Initializes data and starts the server
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting pharmaceutical tracking system...');

// Run initialization script first
const initScript = spawn('node', ['scripts/initializeData.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

initScript.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Initialization failed with exit code ${code}`);
    process.exit(1);
  }

  console.log('✅ Initialization complete, starting server...');

  // Start the main server
  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  // Forward signals to the server process
  process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    server.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, shutting down gracefully...');
    server.kill('SIGINT');
  });

  server.on('close', (code) => {
    console.log(`🛑 Server exited with code ${code}`);
    process.exit(code);
  });

  server.on('error', (err) => {
    console.error('💥 Server error:', err);
    process.exit(1);
  });
});

initScript.on('error', (err) => {
  console.error('💥 Initialization error:', err);
  process.exit(1);
});