const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * PDF Field Coordinates for Form 222
 * 
 * To find coordinates for your Form 222 PDF:
 * 1. Open your blank Form 222 PDF in a viewer
 * 2. Use a tool like Adobe Acrobat or online coordinate finder
 * 3. Coordinates are from bottom-left corner (PDF standard)
 * 4. Format: { x: horizontal_position, y: vertical_position }
 * 
 * Example coordinates (you'll need to adjust these for your actual Form 222):
 */
const FORM_222_COORDINATES = {
  // Header Information
  deaNumber:     { x: 631.5,  y: 686.25 },
  businessName:  { x: 483.0,  y: 641.25 },
  streetAddress: { x: 483.0,  y: 621.0  },
  city:          { x: 483.0,  y: 598.5  },
  state:         { x: 600.0,  y: 598.5  },
  zipCode:       { x: 705.0,  y: 598.5  },

  // Date fields
  dateOrdered:   { x: 292.5,  y: 540.0  },

  // Total Line Items
  totalLineItems:{ x: 15.0,   y: 186.0  },

  // Line items
  lineItems: {
    startY: 481.5,        // (was 493.5)
    lineHeight: 18.0,
    maxItemsPerPage: 20,
    columns: {
      quantity:    { x: 40.5   },
      packageSize: { x: 91.5   },
      itemName:    { x: 131.25 },
      ndc: {
        x: 479.25,
        digitSpacing: 18.0
      },
    }
  }
};


/**
 * Fill client information on a PDF page
 * @param {Object} page - PDF page object
 * @param {Object} client - Client data
 * @param {Object} font - PDF font object
 * @param {number} totalLineItems - Total number of line items
 */
function fillClientInfo(page, client, font, totalLineItems) {
  if (!client) return;

  page.drawText(client.deaNumber || '', {
    x: FORM_222_COORDINATES.deaNumber.x,
    y: FORM_222_COORDINATES.deaNumber.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(client.businessName || '', {
    x: FORM_222_COORDINATES.businessName.x,
    y: FORM_222_COORDINATES.businessName.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(client.streetAddress || '', {
    x: FORM_222_COORDINATES.streetAddress.x,
    y: FORM_222_COORDINATES.streetAddress.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(client.city || '', {
    x: FORM_222_COORDINATES.city.x,
    y: FORM_222_COORDINATES.city.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(client.state || '', {
    x: FORM_222_COORDINATES.state.x,
    y: FORM_222_COORDINATES.state.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(client.zipCode || '', {
    x: FORM_222_COORDINATES.zipCode.x,
    y: FORM_222_COORDINATES.zipCode.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Fill in date
  const currentDate = new Date().toLocaleDateString('en-US');
  page.drawText(currentDate, {
    x: FORM_222_COORDINATES.dateOrdered.x,
    y: FORM_222_COORDINATES.dateOrdered.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Fill in total line items
  page.drawText(totalLineItems.toString(), {
    x: FORM_222_COORDINATES.totalLineItems.x,
    y: FORM_222_COORDINATES.totalLineItems.y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
}

/**
 * Fill line items on a PDF page
 * @param {Object} page - PDF page object
 * @param {Array} lineItems - Array of line items to render
 * @param {Object} font - PDF font object
 * @param {number} startIndex - Starting index for line numbering
 */
function fillLineItems(page, lineItems, font, startIndex = 0) {
  const lineItemCoords = FORM_222_COORDINATES.lineItems;
  
  lineItems.forEach((item, index) => {
    const yPosition = lineItemCoords.startY - (index * lineItemCoords.lineHeight);
    
    // Quantity
    page.drawText(item.packages?.toString() || '0', {
      x: lineItemCoords.columns.quantity.x,
      y: yPosition,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    // Package Size
    page.drawText(item.packageSize || '', {
      x: lineItemCoords.columns.packageSize.x,
      y: yPosition,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    // Item Name (truncate if too long)
    const itemName = item.itemName || '';
    const truncatedName = itemName.length > 25 ? itemName.substring(0, 25) + '...' : itemName;
    page.drawText(truncatedName, {
      x: lineItemCoords.columns.itemName.x,
      y: yPosition,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    // NDC - Draw each digit with spacing
    const ndcValue = item.ndc11 || '';
    if (ndcValue) {
      // Remove any dashes or formatting, keep only digits
      const ndcDigits = ndcValue.replace(/\D/g, '');
      const ndcCoords = lineItemCoords.columns.ndc;
      
      // Draw each digit with the specified spacing
      for (let i = 0; i < ndcDigits.length; i++) {
        const digitX = ndcCoords.x + (i * ndcCoords.digitSpacing);
        page.drawText(ndcDigits[i], {
          x: digitX,
          y: yPosition,
          size: 9,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    }
  });
}

/**
 * Generate a Form 222 PDF from report data
 * @param {Object} reportData - Report data including client info and line items
 * @param {string} templatePath - Path to blank Form 222 PDF template
 * @returns {Promise<Buffer>} - Generated PDF as buffer
 */
async function generateForm222PDF(reportData, templatePath = null) {
  try {
    const lineItems = reportData.lineItems || [];
    const totalLineItems = lineItems.length;
    const maxItemsPerPage = FORM_222_COORDINATES.lineItems.maxItemsPerPage;
    const pagesNeeded = Math.ceil(totalLineItems / maxItemsPerPage);
    
    let pdfDoc;
    let templateBytes = null;
    
    // Load template if provided
    if (templatePath && fs.existsSync(templatePath)) {
      templateBytes = fs.readFileSync(templatePath);
    }
    
    // Create or load the first page
    if (templateBytes) {
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([792, 612]); // Landscape: width=11", height=8.5"
    }
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Process each page
    for (let pageIndex = 0; pageIndex < pagesNeeded; pageIndex++) {
      let currentPage;
      
      if (pageIndex === 0) {
        // Use the first page (either from template or newly created)
        currentPage = pdfDoc.getPages()[0];
      } else {
        // Add new pages for continuation
        if (templateBytes) {
          // If we have a template, load a fresh copy for each additional page
          const templateDoc = await PDFDocument.load(templateBytes);
          const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
          currentPage = pdfDoc.addPage(templatePage);
        } else {
          // Create a blank page
          currentPage = pdfDoc.addPage([792, 612]); // Landscape
        }
      }
      
      // Fill client information on each page
      fillClientInfo(currentPage, reportData.client, font, totalLineItems);
      
      // Calculate line items for this page
      const startIndex = pageIndex * maxItemsPerPage;
      const endIndex = Math.min(startIndex + maxItemsPerPage, totalLineItems);
      const pageLineItems = lineItems.slice(startIndex, endIndex);
      
      // Fill line items for this page
      fillLineItems(currentPage, pageLineItems, font, startIndex);
      
      // Add page indicator if multiple pages
      if (pagesNeeded > 1) {
        currentPage.drawText(`Page ${pageIndex + 1} of ${pagesNeeded}`, {
          x: 500,
          y: 30,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
    
    // Save the PDF as bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('Error generating Form 222 PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Update coordinates for Form 222 fields
 * This allows you to adjust coordinates without modifying the main generation logic
 * @param {Object} newCoordinates - New coordinate mapping
 */
function updateForm222Coordinates(newCoordinates) {
  Object.assign(FORM_222_COORDINATES, newCoordinates);
}

/**
 * Get current coordinate configuration
 * @returns {Object} Current coordinate mapping
 */
function getForm222Coordinates() {
  return { ...FORM_222_COORDINATES };
}

module.exports = {
  generateForm222PDF,
  updateForm222Coordinates,
  getForm222Coordinates,
  FORM_222_COORDINATES
};
