const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { 
  FORM_222_COORDINATES: FORM_222_CONFIG, 
  getLineItemY, 
  formatNDC, 
  validateForm222Data 
} = require('./form222-coordinates');

// Check if we're in development mode
// ALWAYS show Form 222 JPG in background for coordinate mapping
const isDevelopment = true; // process.env.NODE_ENV === 'development' || process.env.FORM_222_DEV_MODE === 'true';

// Path to the JPG template (only used in development)
const DEA_FORM_JPG_PATH = path.join(__dirname, '..', '..', 'dea1.jpg');

// Use the imported coordinates
const FORM_222_COORDINATES = FORM_222_CONFIG;


/**
 * Add coordinate grid for development mode
 * @param {Object} page - PDF page object
 * @param {Object} font - PDF font object
 */
function addCoordinateGrid(page, font) {
  const gridSpacing = FORM_222_CONFIG?.development?.gridSpacing || 50;
  const gridColor = FORM_222_CONFIG?.development?.gridColor || { r: 1, g: 0, b: 0 };
  const gridOpacity = FORM_222_CONFIG?.development?.gridOpacity || 0.2;
  const fontSize = FORM_222_CONFIG?.development?.coordinateFontSize || 6;
  
  // Draw vertical lines (landscape: width=792)
  for (let x = 0; x <= 792; x += gridSpacing) {
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: 612 },
      thickness: 0.5,
      color: rgb(gridColor.r, gridColor.g, gridColor.b),
      opacity: gridOpacity,
    });
  }
  
  // Draw horizontal lines (landscape: height=612)
  for (let y = 0; y <= 612; y += gridSpacing) {
    page.drawLine({
      start: { x: 0, y },
      end: { x: 792, y },
      thickness: 0.5,
      color: rgb(gridColor.r, gridColor.g, gridColor.b),
      opacity: gridOpacity,
    });
  }
  
  // Add coordinate labels
  for (let x = 0; x <= 792; x += gridSpacing) {
    for (let y = 0; y <= 612; y += gridSpacing) {
      page.drawText(`${x},${y}`, {
        x: x + 2,
        y: y + 2,
        size: fontSize,
        font: font,
        color: rgb(gridColor.r, gridColor.g, gridColor.b),
        opacity: 0.5,
      });
    }
  }
}

/**
 * Fill client information on a PDF page
 * @param {Object} page - PDF page object
 * @param {Object} client - Client data
 * @param {Object} font - PDF font object
 * @param {number} totalLineItems - Total number of line items
 */
function fillClientInfo(page, client, font, totalLineItems) {
  if (!client) return;
  
  // Use the new coordinate structure from form222-coordinates.js
  const coords = FORM_222_CONFIG || FORM_222_COORDINATES;
  
  // DEA Number - Draw each character with spacing if characterSpacing is defined
  if (client.deaNumber && coords.deaNumber) {
    const deaFontSize = coords.deaNumber.size || 8;
    if (coords.deaNumber.characterSpacing) {
      // Draw each character with the specified spacing
      for (let i = 0; i < client.deaNumber.length; i++) {
        const charX = coords.deaNumber.x + (i * coords.deaNumber.characterSpacing);
        page.drawText(client.deaNumber[i], {
          x: charX,
          y: coords.deaNumber.y,
          size: deaFontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    } else {
      // Draw DEA number as a single string if no character spacing specified
      page.drawText(client.deaNumber, {
        x: coords.deaNumber.x,
        y: coords.deaNumber.y,
        size: deaFontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
  }
  
  // Business Information - using base coordinates with offsets
  const business = coords.business;
  if (business) {
    const baseX = business.baseX || 490;
    const baseY = business.baseY || 465;
    const fontSize = business.size || 8;
    
    // Business Name
    if (client.businessName) {
      const yOffset = business.name?.yOffset || 0;
      page.drawText(client.businessName, {
        x: baseX,
        y: baseY + yOffset,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Street Address
    if (client.streetAddress) {
      const yOffset = business.streetAddress?.yOffset || -20;
      page.drawText(client.streetAddress, {
        x: baseX,
        y: baseY + yOffset,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // City
    if (client.city) {
      const yOffset = business.city?.yOffset || -40;
      page.drawText(client.city, {
        x: baseX,
        y: baseY + yOffset,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // State
    if (client.state) {
      const xOffset = business.state?.xOffset || 110;
      const yOffset = business.state?.yOffset || -40;
      page.drawText(client.state, {
        x: baseX + xOffset,
        y: baseY + yOffset,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // ZIP Code
    if (client.zipCode) {
      const xOffset = business.zipCode?.xOffset || 210;
      const yOffset = business.zipCode?.yOffset || -40;
      page.drawText(client.zipCode, {
        x: baseX + xOffset,
        y: baseY + yOffset,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Fill in date
  const currentDate = new Date().toLocaleDateString('en-US');
  if (coords.orderDate) {
    page.drawText(currentDate, {
      x: coords.orderDate.x,
      y: coords.orderDate.y,
      size: 8,
      font: font,
      color: rgb(0, 0, 0),
    });
  }

  // Fill in total line items
  if (coords.footer?.totalLineItems) {
    page.drawText(totalLineItems.toString(), {
      x: coords.footer.totalLineItems.x,
      y: coords.footer.totalLineItems.y,
      size: coords.footer.totalLineItems.size || 10,
      font: font,
      color: rgb(0, 0, 0),
    });
  }
}

/**
 * Fill line items on a PDF page
 * @param {Object} page - PDF page object
 * @param {Array} lineItems - Array of line items to render
 * @param {Object} font - PDF font object
 * @param {number} startIndex - Starting index for line numbering
 */
function fillLineItems(page, lineItems, font, startIndex = 0) {
  // Use the new coordinate structure
  const coords = FORM_222_CONFIG || FORM_222_COORDINATES;
  const lineItemCoords = coords.lineItems;
  
  if (!lineItemCoords) return;
  
  lineItems.forEach((item, index) => {
    const yPosition = lineItemCoords.startY - (index * lineItemCoords.lineHeight);
    
    // Line Number
    if (lineItemCoords.columns.lineNumber) {
      page.drawText((startIndex + index + 1).toString(), {
        x: lineItemCoords.columns.lineNumber.x,
        y: yPosition,
        size: lineItemCoords.columns.lineNumber.size || 9,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Quantity
    if (lineItemCoords.columns.quantity) {
      page.drawText(item.packages?.toString() || '0', {
        x: lineItemCoords.columns.quantity.x,
        y: yPosition,
        size: lineItemCoords.columns.quantity.size || 9,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Package Size
    if (lineItemCoords.columns.packageSize) {
      page.drawText(item.packageSize || '', {
        x: lineItemCoords.columns.packageSize.x,
        y: yPosition,
        size: lineItemCoords.columns.packageSize.size || 9,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Item Name (truncate if too long)
    if (lineItemCoords.columns.itemName) {
      const itemName = item.itemName || '';
      const maxWidth = lineItemCoords.columns.itemName.maxWidth || 25;
      const truncatedName = itemName.length > maxWidth ? itemName.substring(0, maxWidth) + '...' : itemName;
      page.drawText(truncatedName, {
        x: lineItemCoords.columns.itemName.x,
        y: yPosition,
        size: lineItemCoords.columns.itemName.size || 9,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
    
    // NDC - Draw each digit with spacing
    if (lineItemCoords.columns.ndc) {
      const ndcValue = item.ndc11 || '';
      if (ndcValue) {
        // Remove any dashes or formatting, keep only digits
        const ndcDigits = ndcValue.replace(/\D/g, '');
        const ndcCoords = lineItemCoords.columns.ndc;
        
        // Draw each digit with the specified spacing if digitSpacing is defined
        if (ndcCoords.digitSpacing) {
          for (let i = 0; i < ndcDigits.length; i++) {
            const digitX = ndcCoords.x + (i * ndcCoords.digitSpacing);
            page.drawText(ndcDigits[i], {
              x: digitX,
              y: yPosition,
              size: ndcCoords.size || 9,
              font: font,
              color: rgb(0, 0, 0),
            });
          }
        } else {
          // Draw NDC as a single string if no digit spacing specified
          page.drawText(ndcValue, {
            x: ndcCoords.x,
            y: yPosition,
            size: ndcCoords.size || 9,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
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
    if (!reportData) {
      reportData = { lineItems: [] };
    }
    const lineItems = reportData.lineItems || [];
    const totalLineItems = lineItems.length;
    const maxItemsPerPage = FORM_222_COORDINATES.lineItems?.maxItemsPerPage || 10;
    const pagesNeeded = Math.ceil(totalLineItems / maxItemsPerPage) || 1;
    
    let pdfDoc = await PDFDocument.create();
    
    // Use Courier (monospace) for better alignment on pre-printed forms
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
    
    // Load JPG in development mode
    let jpgImage = null;
    if (isDevelopment && fs.existsSync(DEA_FORM_JPG_PATH)) {
      try {
        const jpgBytes = fs.readFileSync(DEA_FORM_JPG_PATH);
        jpgImage = await pdfDoc.embedJpg(jpgBytes);
        console.log('Development mode: Loaded DEA Form JPG for coordinate reference');
      } catch (error) {
        console.warn('Could not load DEA Form JPG:', error.message);
      }
    }
    
    // Process each page
    for (let pageIndex = 0; pageIndex < pagesNeeded; pageIndex++) {
      // Form 222 is landscape orientation (11" x 8.5")
      const currentPage = pdfDoc.addPage([792, 612]); // Landscape
      
      // In development mode, add the JPG as background
      if (isDevelopment && jpgImage) {
        currentPage.drawImage(jpgImage, {
          x: 0,
          y: 0,
          width: 792,
          height: 612,
          opacity: FORM_222_CONFIG?.development?.jpgOpacity || 0.3,
        });
        
        // Add coordinate grid in development mode
        if (FORM_222_CONFIG?.development?.showCoordinates) {
          addCoordinateGrid(currentPage, font);
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

/**
 * Generate a general inventory report PDF
 * @param {Object} reportData - Report data including client info and line items
 * @returns {Promise<Buffer>} - Generated PDF as buffer
 */
async function generateInventoryPDF(reportData) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    let yPosition = height - 50;
    
    // Title
    page.drawText('PHARMACEUTICAL INVENTORY REPORT', {
      x: 50,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;
    
    // Client Information
    if (reportData.client) {
      page.drawText('Client Information:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      const clientInfo = [
        `Business: ${reportData.client.businessName || 'N/A'}`,
        `DEA Number: ${reportData.client.deaNumber || 'N/A'}`,
        `Address: ${reportData.client.streetAddress || ''}, ${reportData.client.city || ''}, ${reportData.client.state || ''} ${reportData.client.zipCode || ''}`,
      ];
      
      clientInfo.forEach(info => {
        page.drawText(info, {
          x: 70,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      });
    }
    
    // Report Date and Statistics
    yPosition -= 10;
    page.drawText(`Report Date: ${new Date().toLocaleDateString('en-US')}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
    
    // Count items by DEA schedule
    const stats = {
      total: reportData.lineItems?.length || 0,
      cii: 0,
      ciii: 0,
      civ: 0,
      cv: 0,
      nonControlled: 0
    };
    
    reportData.lineItems?.forEach(item => {
      switch (item.dea_schedule) {
        case 'CII': stats.cii++; break;
        case 'CIII': stats.ciii++; break;
        case 'CIV': stats.civ++; break;
        case 'CV': stats.cv++; break;
        default: stats.nonControlled++; break;
      }
    });
    
    page.drawText(`Total Items: ${stats.total} (CII: ${stats.cii}, CIII: ${stats.ciii}, CIV: ${stats.civ}, CV: ${stats.cv}, Non-Controlled: ${stats.nonControlled})`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 25;
    
    // Table Headers
    page.drawText('Inventory Items:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
    
    // Table header row
    const headers = ['#', 'Item Name', 'NDC', 'Package', 'Qty', '$/Unit', 'Total', 'DEA'];
    const xPositions = [50, 70, 220, 300, 360, 400, 460, 510];
    
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: xPositions[index],
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    });
    yPosition -= 5;
    
    // Draw line under headers
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 550, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
    
    // Calculate total price
    let totalPrice = 0;
    
    // Table rows
    reportData.lineItems?.forEach((item, index) => {
      // Check if we need a new page
      if (yPosition < 100) {
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = height - 50;
      }
      
      const pricePerUnit = item.pricePerUnit || 0;
      const unitsPerPackage = item.unitsPerPackage || 1;
      const quantity = item.packages || 0;
      const itemTotal = pricePerUnit * unitsPerPackage * quantity;
      totalPrice += itemTotal;

      const rowData = [
        (index + 1).toString(),
        (item.itemName || 'Unknown').substring(0, 25),
        item.ndc11 || 'N/A',
        (item.packageSize || 'N/A').substring(0, 10),
        quantity.toString(),
        `$${pricePerUnit.toFixed(4)}`,
        `$${itemTotal.toFixed(2)}`,
        item.dea_schedule || '-'
      ];
      
      // Highlight controlled substances
      const textColor = item.dea_schedule === 'CII' ? rgb(0.8, 0, 0) : rgb(0, 0, 0);
      const textFont = item.dea_schedule === 'CII' ? boldFont : font;
      
      rowData.forEach((data, colIndex) => {
        page.drawText(data, {
          x: xPositions[colIndex],
          y: yPosition,
          size: 9,
          font: colIndex === 7 && item.dea_schedule ? textFont : font,
          color: colIndex === 7 && item.dea_schedule === 'CII' ? textColor : rgb(0, 0, 0),
        });
      });
      yPosition -= 15;
    });
    
    // Draw line above total
    yPosition -= 5;
    page.drawLine({
      start: { x: 350, y: yPosition },
      end: { x: 500, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
    
    // Total Price
    page.drawText('TOTAL:', {
      x: 350,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`$${totalPrice.toFixed(2)}`, {
      x: 460,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;
    
    // Footer
    if (yPosition > 50) {
      yPosition = 50;
    }
    page.drawText('PDF generated by Direct Returns', {
      x: width / 2 - 100,
      y: yPosition,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating inventory PDF:', error);
    throw error;
  }
}

/**
 * Generate a coordinate finder PDF for development
 * This creates a PDF with the JPG background and coordinate grid
 * to help find exact positions for Form 222 fields
 */
async function generateCoordinateFinder() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([792, 612]); // Landscape
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    
    // Load and draw the JPG
    if (fs.existsSync(DEA_FORM_JPG_PATH)) {
      const jpgBytes = fs.readFileSync(DEA_FORM_JPG_PATH);
      const jpgImage = await pdfDoc.embedJpg(jpgBytes);
      
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: 792,
        height: 612,
        opacity: 0.5,
      });
    }
    
    // Add detailed coordinate grid
    const gridSpacing = 25; // Smaller spacing for more precision
    
    // Draw vertical lines
    for (let x = 0; x <= 792; x += gridSpacing) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: 612 },
        thickness: 0.5,
        color: rgb(1, 0, 0),
        opacity: 0.3,
      });
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= 612; y += gridSpacing) {
      page.drawLine({
        start: { x: 0, y },
        end: { x: 792, y },
        thickness: 0.5,
        color: rgb(1, 0, 0),
        opacity: 0.3,
      });
    }
    
    // Add coordinate labels at intersections
    for (let x = 0; x <= 792; x += gridSpacing * 2) {
      for (let y = 0; y <= 612; y += gridSpacing * 2) {
        page.drawText(`${x},${y}`, {
          x: x + 2,
          y: y + 2,
          size: 7,
          font: font,
          color: rgb(0, 0, 1),
        });
      }
    }
    
    // Add title (adjusted for landscape)
    page.drawText('DEA Form 222 Coordinate Finder (Landscape)', {
      x: 250,
      y: 580,
      size: 16,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    const pdfBytes = await pdfDoc.save();
    
    // Save to file for reference
    const outputPath = path.join(__dirname, '..', '..', 'form222-coordinate-guide.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`Coordinate guide saved to: ${outputPath}`);
    
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating coordinate finder:', error);
    throw error;
  }
}

module.exports = {
  generateForm222PDF,
  generateInventoryPDF,
  generateCoordinateFinder,
  updateForm222Coordinates,
  getForm222Coordinates,
  FORM_222_COORDINATES
};
