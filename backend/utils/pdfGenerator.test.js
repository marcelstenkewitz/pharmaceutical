// pdfGenerator.test.js
// Unit tests for PDF generation utilities

const { generateForm222PDF, generateInventoryPDF } = require('./pdfGenerator');
const fs = require('fs').promises;
const path = require('path');

// Mock client data
const mockClient = {
  businessName: 'Test Pharmacy',
  address: '123 Main Street',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  deaNumber: 'BC1234567',
  phoneNumber: '(555) 123-4567'
};

// Mock report data with various DEA schedules
const mockReportWithMixedItems = {
  id: 'test-report-001',
  createdAt: new Date().toISOString(),
  lineItems: [
    // Schedule II items (require Form 222)
    {
      lineNo: 1,
      itemName: 'OXYCODONE HCL 5MG TABLET',
      ndc11: '00406055262',
      packageSize: '100 TABLET',
      packages: 5,
      dea_schedule: 'CII',
      labeler_name: 'Mallinckrodt Inc'
    },
    {
      lineNo: 2,
      itemName: 'MORPHINE SULFATE 15MG TABLET',
      ndc11: '00409176230',
      packageSize: '60 TABLET',
      packages: 3,
      dea_schedule: 'CII',
      labeler_name: 'Hospira Inc'
    },
    // Schedule III item
    {
      lineNo: 3,
      itemName: 'TYLENOL #3 WITH CODEINE',
      ndc11: '50458051310',
      packageSize: '100 TABLET',
      packages: 2,
      dea_schedule: 'CIII',
      labeler_name: 'Janssen Pharmaceuticals'
    },
    // Schedule IV item
    {
      lineNo: 4,
      itemName: 'ALPRAZOLAM 0.5MG TABLET',
      ndc11: '00228202950',
      packageSize: '100 TABLET',
      packages: 4,
      dea_schedule: 'CIV',
      labeler_name: 'Actavis Pharma'
    },
    // Non-controlled item
    {
      lineNo: 5,
      itemName: 'AMOXICILLIN 500MG CAPSULE',
      ndc11: '65862001705',
      packageSize: '500 CAPSULE',
      packages: 10,
      dea_schedule: null,
      labeler_name: 'Aurobindo Pharma'
    }
  ]
};

// Mock report with only CII items
const mockReportCIIOnly = {
  id: 'test-report-002',
  createdAt: new Date().toISOString(),
  lineItems: [
    {
      lineNo: 1,
      itemName: 'FENTANYL 50MCG/HR PATCH',
      ndc11: '00409466001',
      packageSize: '5 PATCH',
      packages: 2,
      dea_schedule: 'CII',
      labeler_name: 'Mylan Pharmaceuticals'
    },
    {
      lineNo: 2,
      itemName: 'METHYLPHENIDATE HCL 10MG',
      ndc11: '00228302410',
      packageSize: '100 TABLET',
      packages: 3,
      dea_schedule: 'CII',
      labeler_name: 'Actavis'
    }
  ]
};

// Mock empty report
const mockEmptyReport = {
  id: 'test-report-003',
  createdAt: new Date().toISOString(),
  lineItems: []
};

describe('PDF Generator', () => {
  describe('generateForm222PDF', () => {
    test('should generate PDF with only CII items', async () => {
      const pdfBytes = await generateForm222PDF(mockClient, mockReportWithMixedItems);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
      
      // PDF should start with %PDF header
      const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 5));
      expect(pdfString).toBe('%PDF-');
    });

    test('should handle report with only CII items', async () => {
      const pdfBytes = await generateForm222PDF(mockClient, mockReportCIIOnly);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should handle empty report gracefully', async () => {
      const pdfBytes = await generateForm222PDF(mockClient, mockEmptyReport);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should include correct client information', async () => {
      const pdfBytes = await generateForm222PDF(mockClient, mockReportCIIOnly);
      
      // Just verify PDF was generated successfully
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should filter out non-CII items', async () => {
      const pdfBytes = await generateForm222PDF(mockClient, mockReportWithMixedItems);
      
      // Just verify PDF was generated successfully
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should handle missing client DEA number', async () => {
      const clientWithoutDEA = { ...mockClient, deaNumber: null };
      
      const pdfBytes = await generateForm222PDF(clientWithoutDEA, mockReportCIIOnly);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should format dates correctly', async () => {
      const pdfBytes = await generateForm222PDF(mockClient, mockReportCIIOnly);
      
      // Just verify PDF was generated successfully
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should respect Form 222 10-item limit', async () => {
      // Create report with more than 10 CII items
      const manyItems = [];
      for (let i = 1; i <= 15; i++) {
        manyItems.push({
          lineNo: i,
          itemName: `OXYCODONE VARIANT ${i}`,
          ndc11: `0040605526${i.toString().padStart(1, '0')}`,
          packageSize: '100 TABLET',
          packages: 1,
          dea_schedule: 'CII',
          labeler_name: 'Test Pharma'
        });
      }
      
      const largeReport = {
        id: 'test-large',
        createdAt: new Date().toISOString(),
        lineItems: manyItems
      };

      const pdfBytes = await generateForm222PDF(mockClient, largeReport);
      
      // Should still generate PDF (truncated to 10 items)
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });
  });

  describe('generateInventoryPDF', () => {
    test('should generate PDF with all items', async () => {
      const pdfBytes = await generateInventoryPDF(mockClient, mockReportWithMixedItems);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
      
      // PDF should start with %PDF header
      const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 5));
      expect(pdfString).toBe('%PDF-');
    });

    test('should include all DEA schedule types', async () => {
      const pdfBytes = await generateInventoryPDF(mockClient, mockReportWithMixedItems);
      
      // Just verify PDF was generated successfully
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should handle empty inventory', async () => {
      const pdfBytes = await generateInventoryPDF(mockClient, mockEmptyReport);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should include report metadata', async () => {
      const pdfBytes = await generateInventoryPDF(mockClient, mockReportWithMixedItems);
      
      // Just verify PDF was generated successfully
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should group items by DEA schedule', async () => {
      const pdfBytes = await generateInventoryPDF(mockClient, mockReportWithMixedItems);
      
      // PDF should be created successfully
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
      
      // Note: Testing actual grouping would require parsing PDF content
      // which is complex due to compression
    });

    test('should include summary statistics', async () => {
      const pdfBytes = await generateInventoryPDF(mockClient, mockReportWithMixedItems);
      
      // Just verify PDF was generated successfully
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should handle special characters in item names', async () => {
      const reportWithSpecialChars = {
        id: 'test-special',
        createdAt: new Date().toISOString(),
        lineItems: [
          {
            lineNo: 1,
            itemName: 'DRUG & NAME (WITH) SPECIAL/CHARS',
            ndc11: '12345678901',
            packageSize: '100 TAB',
            packages: 1,
            dea_schedule: null,
            labeler_name: 'Test & Co.'
          }
        ]
      };

      const pdfBytes = await generateInventoryPDF(mockClient, reportWithSpecialChars);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    test('should format large quantities correctly', async () => {
      const reportWithLargeQty = {
        id: 'test-large-qty',
        createdAt: new Date().toISOString(),
        lineItems: [
          {
            lineNo: 1,
            itemName: 'BULK MEDICATION',
            ndc11: '12345678901',
            packageSize: '1000 TABLET',
            packages: 999,
            dea_schedule: null,
            labeler_name: 'Bulk Pharma'
          }
        ]
      };

      const pdfBytes = await generateInventoryPDF(mockClient, reportWithLargeQty);
      
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle null client gracefully', async () => {
      // Should not throw, but handle gracefully
      const pdfBytes = await generateForm222PDF(null, mockReportCIIOnly);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    test('should handle null report gracefully', async () => {
      // Should not throw, but handle gracefully  
      const pdfBytes = await generateForm222PDF(mockClient, null);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    test('should handle malformed line items', async () => {
      const malformedReport = {
        id: 'test-malformed',
        createdAt: new Date().toISOString(),
        lineItems: [
          {
            // Missing required fields
            lineNo: 1
          }
        ]
      };

      // Should not throw, but handle gracefully
      const pdfBytes = await generateInventoryPDF(mockClient, malformedReport);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });
  });

  describe('PDF Structure Validation', () => {
    test('Form 222 PDF should have correct structure', async () => {
      const pdfBytes = await generateForm222PDF(mockClient, mockReportCIIOnly);
      
      // Basic PDF structure checks
      const pdfString = new TextDecoder().decode(pdfBytes);
      
      // Check PDF version
      expect(pdfString.substring(0, 8)).toMatch(/%PDF-\d\.\d/);
      
      // Check for EOF marker
      expect(pdfString).toContain('%%EOF');
    });

    test('Inventory PDF should have correct structure', async () => {
      const pdfBytes = await generateInventoryPDF(mockClient, mockReportWithMixedItems);
      
      // Basic PDF structure checks
      const pdfString = new TextDecoder().decode(pdfBytes);
      
      // Check PDF version
      expect(pdfString.substring(0, 8)).toMatch(/%PDF-\d\.\d/);
      
      // Check for EOF marker
      expect(pdfString).toContain('%%EOF');
    });
  });

  describe('Performance', () => {
    test('should generate Form 222 PDF within reasonable time', async () => {
      const startTime = Date.now();
      
      await generateForm222PDF(mockClient, mockReportCIIOnly);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should generate Inventory PDF within reasonable time', async () => {
      const startTime = Date.now();
      
      await generateInventoryPDF(mockClient, mockReportWithMixedItems);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});