# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a pharmaceutical tracking system with barcode scanning capabilities for managing Form 222 (DEA controlled substance ordering forms). The application consists of a React frontend and Express.js backend for tracking pharmaceutical products, managing client information, and generating PDF reports.

## Architecture

### Frontend (React)
- **Location**: `/frontend`
- **Framework**: React 18 with React Router v6
- **UI**: Bootstrap 5 and React Bootstrap
- **Key Features**:
  - Barcode scanning (ZXing library, GS1 barcode parsing)
  - Client management
  - Report generation
  - Manual entry management
  - Labeler management

### Backend (Express.js)
- **Location**: `/backend`
- **Framework**: Express 5
- **Port**: 3001 (default)
- **Data Storage**: JSON files (`clients.json`, `reports.json`, `manual-entries.json`, `labelers.json`)
- **Key Features**:
  - RESTful API for client CRUD operations
  - Form 222 PDF generation with pdf-lib
  - Report management
  - NDC (National Drug Code) lookups

### Shared Models
- **Location**: `/frontend/src/models`
- PharmInventoryModel (formerly Form222Model) for inventory line items

## Development Commands

### Frontend
```bash
cd frontend
npm install           # Install dependencies
npm start            # Start development server (port 3000)
npm test             # Run tests in watch mode
npm run build        # Build for production
```

### Backend
```bash
cd backend
npm install          # Install dependencies
npm start           # Start production server
npm run dev         # Start with nodemon (auto-reload)
```

## Key API Endpoints

- `GET /api/clients` - List all clients
- `POST /api/clients` - Add a new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `POST /api/clients/:id/reports` - Attach report to client
- `GET /api/manual-entries` - Get manual NDC entries
- `GET /api/labelers` - Get labeler information
- `POST /api/generate-form-222` - Generate Form 222 PDF

## Important Files

- `/backend/server.js` - Main Express server with all API routes
- `/backend/utils/pdfGenerator.js` - Form 222 PDF generation logic with coordinate mapping
- `/frontend/src/App.js` - Main React app with routing configuration
- `/frontend/src/services/NdcService.js` - NDC barcode parsing and FDA lookup service
- `/frontend/src/components/Scanning/ScanOut.js` - Main scanning component
- `/frontend/src/components/Reports/Reports.js` - Report management interface

## Data Models

### Client
```javascript
{
  id: string,
  name: string,
  businessName: string,
  deaNumber: string,
  streetAddress: string,
  city: string,
  state: string,
  zipCode: string,
  reports: array
}
```

### Form 222 Item
```javascript
{
  ndc: string,
  name: string,
  strength: string,
  packageSize: string,
  quantity: number,
  price: number,
  expirationDate: string,
  lotNumber: string
}
```

## CORS Configuration

Backend is configured to accept requests from `http://localhost:3000` (frontend dev server).

## Notes

- The system uses GS1 barcode standards for pharmaceutical product tracking
- Form 222 PDF coordinates are configured in `/backend/utils/pdfGenerator.js`
- No authentication system is currently implemented (noted in TODO comments)
- Test coverage is minimal (no test files found in codebase)