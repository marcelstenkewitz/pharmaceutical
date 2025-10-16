const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Import controllers
const HealthController = require('./controllers/HealthController');
const ClientController = require('./controllers/ClientController');
const ReportController = require('./controllers/ReportController');
const ManualEntryController = require('./controllers/ManualEntryController');
const LabelerController = require('./controllers/LabelerController');
const WholesalerController = require('./controllers/WholesalerController');
const CompanySettingsController = require('./controllers/CompanySettingsController');
const PDFController = require('./controllers/PDFController');

// Import route registration
const { registerRoutes } = require('./routes');

const { createRepositoryService } = require('./services/RepositoryService');

// Use port 3001 for local development, process.env.PORT for production (Render)
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Use writable data directory - will be determined dynamically for production
// Note: DATA_DIR will be set after production detection
let DATA_DIR;
let DATA_FILE;

const app = express();

// Check if we're in production (multiple ways to detect)
const isProduction = process.env.NODE_ENV === 'production' ||
                    process.env.RENDER === 'true' ||
                    fs.existsSync(path.join(__dirname, 'public', 'index.html'));

console.log(`Environment check - NODE_ENV: ${process.env.NODE_ENV}, RENDER: ${process.env.RENDER}, isProduction: ${isProduction}`);

// Set DATA_DIR based on production detection
DATA_DIR = isProduction ? '/app/data' : path.join(__dirname, 'storage');
console.log(`Data directory set to: ${DATA_DIR}`);

// CORS configuration - allow all origins in production, localhost in development
const corsOptions = {
  origin: isProduction
    ? true  // Allow all origins in production
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// Serve static files from the React app build (for production)
if (isProduction) {
  // Serve static files with proper MIME types
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  console.log(`Static files served from: ${path.join(__dirname, 'public')}`);
}

// Function to update all file paths when DATA_DIR changes
function updateFilePaths() {
  DATA_FILE = path.join(DATA_DIR, 'reports.json');
}

// Ensure storage directory exists on startup with proper error handling
function ensureStorageDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`Creating storage directory: ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o755 });
      console.log(`Successfully created storage directory: ${DATA_DIR}`);
    } else {
      console.log(`Storage directory already exists: ${DATA_DIR}`);
    }

    // Test write permissions
    const testFile = path.join(DATA_DIR, '.write-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`Write permissions confirmed for: ${DATA_DIR}`);
      updateFilePaths(); // Update file paths with confirmed directory
    } catch (writeError) {
      console.error(`Warning: No write permissions for ${DATA_DIR}:`, writeError.message);
      throw new Error(`Storage directory is not writable: ${DATA_DIR}`);
    }
  } catch (error) {
    console.error(`Failed to ensure storage directory: ${DATA_DIR}`, error);

    // Fallback to a basic temp directory if the configured one fails
    if (process.env.NODE_ENV === 'production') {
      console.log('Attempting fallback to /tmp directory...');
      const fallbackDir = '/tmp';
      try {
        const testFile = path.join(fallbackDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('Fallback directory /tmp is writable, updating DATA_DIR...');

        // Update DATA_DIR and all file paths to use the fallback
        DATA_DIR = fallbackDir;
        updateFilePaths();
        console.log(`Successfully switched to fallback directory: ${DATA_DIR}`);
        return; // Success with fallback
      } catch (fallbackError) {
        console.error('Fallback directory also not writable:', fallbackError.message);
      }
    }

    throw new Error(`Cannot create or access storage directory: ${error.message}`);
  }
}

// Initialize storage directory (after DATA_DIR is set)
ensureStorageDirectory();

// Initialize Repository Service
let repositories;
try {
  repositories = createRepositoryService(DATA_DIR);
  repositories.ensureInitialized();
  console.log('Repository service initialized successfully');
} catch (error) {
  console.error('Failed to initialize repository service:', error);
  throw error;
}

// Initialize Controllers with Repository Service
let controllers;
try {
  controllers = {
    healthController: new HealthController(repositories),
    clientController: new ClientController(repositories),
    reportController: new ReportController(repositories),
    manualEntryController: new ManualEntryController(repositories),
    labelerController: new LabelerController(repositories),
    wholesalerController: new WholesalerController(repositories),
    companySettingsController: new CompanySettingsController(repositories),
    pdfController: new PDFController(repositories)
  };
  console.log('Controllers initialized successfully');
} catch (error) {
  console.error('Failed to initialize controllers:', error);
  throw error;
}

// Register all routes with controllers
try {
  registerRoutes(app, controllers);
} catch (error) {
  console.error('Failed to register routes:', error);
  throw error;
}

// --- PRODUCTION/DEVELOPMENT ROUTING LOGIC ---
if (isProduction) {
  // Production: Serve React app for all non-API, non-static routes
  // Use middleware to catch all remaining routes
  app.use((req, res) => {
    console.log(`Request for: ${req.path}`);

    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      console.log(`API route - not found: ${req.path}`);
      return res.status(404).json({ error: 'API route not found' });
    }

    // Don't serve index.html for static file requests that weren't found
    if (req.path.startsWith('/static/') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.js') ||
        req.path.endsWith('.ico') ||
        req.path.endsWith('.png') ||
        req.path.endsWith('.jpg') ||
        req.path.endsWith('.svg')) {
      console.log(`Static file request - not found: ${req.path}`);
      return res.status(404).send('File not found');
    }

    // Serve React app for all other routes (SPA routing)
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log(`Serving React app for route: ${req.path} from: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).json({ error: 'Failed to serve frontend' });
      }
    });
  });
} else {
  // Development mode: API only, return 404 for non-API routes
  console.log('Running in development mode - API only');
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found - use development frontend' });
  });
}

// Error handling middleware
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start the server if this file is run directly (not in tests)
if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`Simple JSON backend listening at http://${HOST}:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`Data directory: ${DATA_DIR}`);
  });

  // Set timeouts for Render.com as recommended
  server.keepAliveTimeout = 120000; // 120 seconds
  server.headersTimeout = 120000; // 120 seconds
}

// Export the app for testing
module.exports = app;