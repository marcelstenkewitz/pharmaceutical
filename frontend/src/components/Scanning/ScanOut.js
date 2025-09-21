// src/components/Scanning/ScanOut.js
import React, { useContext, useEffect, useState } from "react";
import Wrapper from "../Layout/Wrapper";
import { Alert, Button, Form } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useZxingScanner } from "./useZxingScanner";
import { createNdcService } from "../../services/NdcService";
import { createPriceService } from "../../services/PriceService";
import { FDAResult } from "../../models/FdaResultModel";
import { createInventoryLine, validateInventoryLine } from "../../models/PharmInventoryModel";
import { ClientContext } from "../../context/ClientContext";
import { calculateLineTotal, calculatePackagePrice, parsePackageSize } from "../../services/PricingUtils";
import CurrentItemsTable from "./CurrentItemsTable";
import ManualEntryModal from "./ManualEntryModal";
import apiService from "../../services/ApiService";
import './scan-out.css';
import "./scanning.css";

const ndcService = createNdcService();
const priceService = createPriceService();

const ScanOut = () => {
  const { 
    selectedClient, 
    currentReport, 
    sessionReport,
    createNewReport,
    addLineItemToReport: addLineItemToReportContext,
    clients,
    setSelectedClient,
    loadClients,
    setCurrentReport
  } = useContext(ClientContext);
  
  const { clientId: urlClientId, reportId: urlReportId } = useParams();
  const navigate = useNavigate();
  
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState(null);
  const [editLine, setEditLine] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to clear scan state (for manual clearing or resetting)
  const clearScanState = () => {
    console.debug(`[ScanOut] Clearing scan state`);
    setBarcode("");
    setResult(null);
    setEditLine(null);
    setSubmitStatus(null);
    setIsProcessing(false);
  };

  // Function to validate scan input (prevent obviously invalid inputs)
  const isValidScanInput = (text) => {
    if (!text || typeof text !== 'string') return false;
    
    // Remove non-digits to check basic format
    const digits = text.replace(/\D/g, '');
    
    // Must have at least some digits
    if (digits.length < 8) return false;
    
    // Reject obvious garbage (too many repeating digits, etc.)
    if (/^(.)\1{7,}$/.test(digits)) return false; // 8+ same digits in a row
    
    return true;
  };

  // Get effective client ID from URL or context
  const effectiveClientId = urlClientId || (selectedClient && typeof selectedClient === 'object' 
    ? selectedClient.id 
    : selectedClient);

  // Set up client from URL parameters if provided
  useEffect(() => {
    if (urlClientId && (!selectedClient || (typeof selectedClient === 'string' && selectedClient !== urlClientId))) {
      loadClients().then(() => {
        // After clients are loaded, set the client from URL
        // This will be handled by the next effect when clients are available
      });
    }
  }, [urlClientId, selectedClient, loadClients]);

  // Set selected client from URL after clients are loaded
  useEffect(() => {
    if (urlClientId && clients.length > 0 && (!selectedClient || (typeof selectedClient === 'string' && selectedClient !== urlClientId))) {
      const clientFromUrl = clients.find(c => c.id === urlClientId);
      if (clientFromUrl) {
        setSelectedClient(clientFromUrl);
      }
    }
  }, [urlClientId, clients, selectedClient, setSelectedClient]);

  // Set up report from URL parameters if provided
  useEffect(() => {
    if (urlReportId && urlClientId && (!currentReport || currentReport.id !== urlReportId)) {
      // Load the specific report from the backend
      // For now, we'll set up a basic report structure
      // The actual report data will be populated by the CurrentItemsTable component
      setCurrentReport({
        id: urlReportId,
        clientId: urlClientId,
        items: [] // This will be populated when needed
      });
    }
  }, [urlReportId, urlClientId, currentReport, setCurrentReport]);
  
  // Initialize a new report for the selected client
  useEffect(() => {
    if (selectedClient && !currentReport) {
      // Context will handle initializing the report state
    }
  }, [selectedClient, currentReport]);

  // Handle submit of Form222 line to selected client
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editLine || !effectiveClientId) {
      setSubmitStatus({ ok: false, msg: "No item to submit or no client selected." });
      return;
    }

    // Validate the line item
    const validation = validateInventoryLine(editLine);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setSubmitStatus({ ok: false, msg: `Validation failed: ${validation.errors.join(', ')}` });
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);
    setValidationErrors([]);

    try {
      let targetReportId = sessionReport?.id || currentReport?.id;
      
      // Get the client ID for API calls - use effectiveClientId from URL or context
      const clientId = effectiveClientId;

      // Create a new report if we don't have one
      if (!targetReportId) {
        console.log('Creating new report for session');
        const newReport = await createNewReport(clientId);
        targetReportId = newReport.id;
        console.log('New report created with ID:', targetReportId);
        console.log('New report structure:', newReport);
      }

      // Add the line item using context method
      console.log('Adding line item to report:', targetReportId);
      const result = await addLineItemToReportContext(clientId, editLine, targetReportId);
      console.log('Line item add result:', result);
      console.log('Current report after add:', currentReport);

      // Only show success if we got a valid result
      if (result && result.lineItem) {
        setSubmitStatus({ ok: true, msg: "Item added to the report successfully." });
        setEditLine(null);
        setBarcode("");
        console.log('Item successfully added and form cleared');
        console.log('Final current report state:', currentReport);
      } else {
        console.log('No valid result received:', result);
        setSubmitStatus({ ok: false, msg: "Item was not added to the report. Please try again." });
      }
    } catch (err) {
      console.error('Submit error:', err.message || err);
      if (err.errors && err.errors.length > 0) {
        setValidationErrors(err.errors);
        setSubmitStatus({ ok: false, msg: `Server validation failed: ${err.errors.join(', ')}` });
      } else {
        setSubmitStatus({ ok: false, msg: err.message || "Failed to add item to report." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle manual form submission from modal
  const handleManualSubmit = async (inventoryLineData) => {
    // The data is already in the correct format from formDataToInventoryLine
    // Just mark it as a manual entry and set it as the edit line
    const manualLine = {
      ...inventoryLineData,
      isManualEntry: true
    };

    setEditLine(manualLine);
  };

  const { control, isRunning, error } = useZxingScanner(
    "scannerVideo",
    (text) => {
      console.log(`[ScanOut] 📹 SCANNER CALLBACK triggered with: "${text}"`);
      console.log(`[ScanOut] 📹 Current barcode state: "${barcode}"`);
      console.log(`[ScanOut] 📹 IsProcessing: ${isProcessing}`);

      // Prevent processing if already processing a scan
      if (isProcessing) {
        console.debug(`[ScanOut] Ignoring duplicate scan while processing: ${text}`);
        return;
      }

      // Validate scan input before processing
      if (!isValidScanInput(text)) {
        console.warn(`[ScanOut] Rejecting invalid scan input: ${text}`);
        return;
      }

      // Prevent processing the same barcode multiple times
      if (barcode === text) {
        console.debug(`[ScanOut] Ignoring duplicate barcode: ${text}`);
        return;
      }

      console.debug(`[ScanOut] 📹 Scanner setting barcode to: "${text}"`);
      // Clear previous submit status when new scan is detected
      setSubmitStatus(null);
      setValidationErrors([]);
      setBarcode(text);
      control?.stop?.(); // single-shot behavior
    }
  );

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      console.log(`[ScanOut] 🔄 fetchData called with barcode: "${barcode}"`);

      if (!barcode) {
        console.log(`[ScanOut] 🔄 No barcode, clearing state`);
        setResult(null);
        setEditLine(null);
        setSubmitStatus(null);
        setValidationErrors([]);
        setIsProcessing(false);
        return;
      }

      console.log(`[ScanOut] 🔄 Processing barcode: "${barcode}"`);
      // Clear previous submit status when processing new barcode
      setSubmitStatus(null);
      setValidationErrors([]);
      // Prevent processing duplicate/concurrent requests for same barcode
      setIsProcessing(true);
      setResult({ valid: true, message: "Scanning..." });
      
      let msg = ""; // Initialize message variable
      
      try {
        // First check if this is a cached manual entry (before NDC normalization)
        console.log(`[ScanOut] 🔍 About to call apiService.getManualEntry with: "${barcode}"`);
        console.log(`[ScanOut] 🔍 Barcode type: ${typeof barcode}, length: ${barcode?.length}`);
        const manualEntry = await apiService.getManualEntry(barcode);
        
        if (manualEntry) {
          msg = `🔧 Manual Entry (cached)`;
          msg += `\nItem: ${manualEntry.itemName}`;
          if (manualEntry.packageSize) msg += `\nPackage: ${manualEntry.packageSize}`;
          // Use price field or pricePerEA field from manual entry
          const cachedPrice = manualEntry.price || manualEntry.pricePerEA;
          if (cachedPrice) msg += `\nPrice per EA: $${cachedPrice}`;
          if (manualEntry.labeler_name) msg += `\nLabeler: ${manualEntry.labeler_name}`;

          // Create inventory line from cached manual entry
          const manualLine = createInventoryLine(
            {
              brandName: manualEntry.itemName, // Use itemName as brandName
              genericName: "",
              ndcNumber: manualEntry.ndcNumber,
              packageSize: manualEntry.packageSize,
              labeler_name: manualEntry.labeler_name
            },
            cachedPrice ? {
              pricePerUnit: parseFloat(cachedPrice),
              pricingUnit: 'EA'
            } : null,
            1, // Default package count to 1
            1  // Default total quantity ordered to 1
          );
          
          // Mark as manual entry
          manualLine.isManualEntry = true;
          
          setEditLine(manualLine);
          setResult({ valid: true, message: msg });
          setIsProcessing(false);
          return;
        }
        
        // If no manual entry found, proceed with NDC normalization
        const norm = ndcService.normalizeScan(barcode);
        if (!norm.ok) {
          setResult({ 
            valid: false, 
            message: norm.reason || "Unrecognized barcode format.", 
            allowManualEntry: true  // Allow manual entry even for invalid barcodes
          });
          setEditLine(null);
          setIsProcessing(false);
          return;
        }
        
        msg = `Valid NDC-11: ${norm.ndc11}`;
        
        // Proceed with FDA/pricing lookup for valid NDC
        // Try all NDC candidates to find a match
        let fda = { ok: false };
        let price = { ok: false };
        
        const candidates = norm.ndc11_candidates || [norm.ndc11];
        console.debug(`[ScanOut] 🔍 VERIFICATION LOOP START for input: ${barcode}`);
        console.debug(`[ScanOut] Normalized NDC11: ${norm.ndc11}`);
        console.debug(`[ScanOut] Will verify ${candidates.length} NDC-11 candidate(s): ${candidates.join(', ')}`);
        
        for (const ndc11Candidate of candidates) {
          console.debug(`[ScanOut] 🧪 Trying candidate: ${ndc11Candidate} (from input: ${barcode})`);
          
          // Batch the async operations for this candidate
          const [fdaResponse, priceResponse] = await Promise.allSettled([
            ndcService.verify(ndc11Candidate),
            (async () => {
              const fdaResult = await ndcService.verify(ndc11Candidate);
              if (fdaResult.ok) {
                const fdaResultObj = fdaResult.raw instanceof FDAResult ? fdaResult.raw : new FDAResult(fdaResult.raw);
                return await fdaResultObj.getPrice(priceService, ndc11Candidate);
              }
              return { ok: false, reason: "FDA verification failed" };
            })()
          ]);
          
          const candidateFda = fdaResponse.status === 'fulfilled' ? fdaResponse.value : { ok: false };
          const candidatePrice = priceResponse.status === 'fulfilled' ? priceResponse.value : { ok: false };
          
          console.debug(`[ScanOut] 📊 FDA result for ${ndc11Candidate}:`, candidateFda.ok ? 'SUCCESS' : 'FAILED');
          if (candidateFda.ok) {
            console.debug(`[ScanOut] 📋 FDA data - NDC: ${candidateFda.ndc10}, Product: ${candidateFda.generic_name || candidateFda.brand_name}`);
          }
          
          if (candidateFda.ok) {
            // Found a match! Use this candidate
            fda = candidateFda;
            price = candidatePrice;
            // Update norm.ndc11 to the correct candidate for subsequent code
            norm.ndc11 = ndc11Candidate;
            console.debug(`[ScanOut] ✅ Found match with candidate: ${ndc11Candidate} for input: ${barcode}`);
            break;
          } else {
            console.debug(`[ScanOut] ❌ No match for candidate: ${ndc11Candidate}`);
          }
        }
        
        if (!fda.ok) {
          console.debug(`[ScanOut] No FDA matches found after trying all ${candidates.length} candidates`);
        }
        
        if (ignore) return;
        
        if (fda.ok) {
          const fdaResult = fda.raw instanceof FDAResult ? fda.raw : new FDAResult(fda.raw);
          msg += fdaResult.brand_name ? `\nFDA: ${fdaResult.brand_name} (${fdaResult.generic_name || ''})` : '';
          
          // Display DEA schedule if controlled substance
          if (fdaResult.dea_schedule) {
            const scheduleWarning = fdaResult.dea_schedule === 'CII' ? ' ⚠️ REQUIRES FORM 222' : '';
            msg += `\nDEA Schedule: ${fdaResult.dea_schedule}${scheduleWarning}`;
          }
          
          const matchingPkg = fdaResult.findMatchingPackage(norm.ndc11);
          if (matchingPkg) {
            msg += `\nPackage: ${matchingPkg.description}`;
          }
          
          if (price.ok) {
            msg += `\nPrice: $${price.pricePerUnit.toFixed(4)} per ${price.pricingUnit} (as of ${price.effectiveDate})`;
          } else {
            msg += `\nPrice: Not available (${price.reason})`;
          }
          
          const draft = fdaResult.buildLineDraftFromInput(norm.ndc11);
          const nadacRow = price.ok ? {
            pricePerUnit: price.pricePerUnit,
            pricingUnit: price.pricingUnit
          } : null;
          const formLine = createInventoryLine(draft, nadacRow, 1, 1);
          // Add DEA schedule to the line item
          formLine.dea_schedule = fdaResult.dea_schedule || fda.dea_schedule || null;
          // Mark as FDA verified item - this will lock NDC field from editing
          formLine.hasFDAData = true;
          setEditLine(formLine);
        } else {
          msg += `\nFDA: Not found or not recognized.`;
          setEditLine(null);
        }
        setResult({ valid: true, message: msg, allowManualEntry: !fda.ok });
        setIsProcessing(false);
      } catch (e) {
        if (!ignore) {
          msg += `\nError: ${e.message}`;
          setResult({ valid: false, message: msg, allowManualEntry: true }); // Allow manual entry on API errors with valid NDC/GTIN
          setEditLine(null);
          setIsProcessing(false);
        }
      }
    };

    fetchData();

    return () => { 
      ignore = true; 
      setIsProcessing(false);
    };
  }, [barcode]);

  // useEffect for automatic price recalculation when editing fields
  useEffect(() => {
    const pricePerUnit = parseFloat(editLine?.pricePerUnit) || 0;
    const unitsPerPackage = parseInt(editLine?.unitsPerPackage) || 1;
    const packages = parseInt(editLine?.packages) || 1;
    const currentPricePerPackage = editLine?.pricePerPackage || 0;
    const currentTotalPrice = editLine?.totalPrice || 0;

    if (pricePerUnit && unitsPerPackage && packages) {
      const pricePerPackage = calculatePackagePrice(pricePerUnit, unitsPerPackage);
      const totalPrice = calculateLineTotal(pricePerUnit, unitsPerPackage, packages);

      // Only update if the calculated values are different to avoid infinite loops
      if (currentPricePerPackage !== pricePerPackage || currentTotalPrice !== totalPrice) {
        setEditLine(prev => ({
          ...prev,
          pricePerPackage,
          totalPrice
        }));
      }
    }
  }, [editLine?.pricePerUnit, editLine?.unitsPerPackage, editLine?.packages, editLine?.pricePerPackage, editLine?.totalPrice]);

  return (
    <Wrapper centerText={false}>
      <div className="scan-out-container">
        {error && (
          <Alert variant="danger" className="text-center mb-3">
            <strong>Camera Error:</strong> {error}
          </Alert>
        )}
        
        <h1 className="scan-out-header">Scan Barcode</h1>
        
        {!effectiveClientId && (
          <Alert variant="warning" className="text-center mb-3">
            <strong>No client selected.</strong> Please select a client from the main page first.
            <div className="mt-2">
              <Button variant="outline-primary" onClick={() => navigate('/')}>
                Back to Client Selection
              </Button>
            </div>
          </Alert>
        )}
        
        {effectiveClientId && currentReport?.id && (
          <Alert variant="info" className="text-center mb-3">
            <strong>Adding items to existing report:</strong> {currentReport.id}
          </Alert>
        )}
        
        {effectiveClientId && sessionReport && !currentReport?.id && (
          <Alert variant="success" className="text-center mb-3">
            <strong>New session report created:</strong> {sessionReport.id}
          </Alert>
        )}

        {effectiveClientId && (
          <>
            <div className="camera-controls-container">
        <video
          id="scannerVideo"
          muted
          autoPlay
          playsInline
          className="scan-video-player"
        />

        <div className="scan-control-buttons">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => control?.stop?.()}
            disabled={!isRunning || !control}
            className="scan-control-btn"
          >
            Stop
          </Button>
          <Button
            variant="outline-warning"
            size="sm"
            onClick={clearScanState}
            disabled={!barcode && !result}
            className="scan-control-btn"
          >
            Clear Scan
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => window.location.reload()}
            className="scan-control-btn"
          >
            Reset
          </Button>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="barcode-input-form"
        >
          <input
            type="text"
            placeholder="Scan or enter NDC-11"
            value={barcode}
            onChange={(e) => {
              console.log(`[ScanOut] 📝 Input onChange - Raw value: "${e.target.value}"`);
              console.log(`[ScanOut] 📝 Input onChange - Previous barcode: "${barcode}"`);
              setBarcode(e.target.value);
            }}
            autoFocus
            className="barcode-input-field"
          />
        </form>

        {barcode && (
          <Alert variant="dark" className="scan-alert-container">
            <Alert.Heading>Barcode</Alert.Heading>
            <p className="barcode-display">{barcode}</p>
          </Alert>
        )}
        


        {result && (
          <Alert
            variant={result.valid ? "success" : "danger"}
            className="error-alert-container"
          >
            {result.message}
            {result.allowManualEntry && !showManualEntryModal && (
              <div className="error-details">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setShowManualEntryModal(true)}
                >
                  Enter Manually
                </Button>
              </div>
            )}
          </Alert>
        )}

        <ManualEntryModal
          show={showManualEntryModal}
          onHide={() => setShowManualEntryModal(false)}
          onSubmit={handleManualSubmit}
          initialBarcode={barcode}
          title="Manual Entry - Form 222 Line"
          submitButtonText="Create Line Item"
        />


        {editLine && (
          <div className="manual-entry-container">
            <Alert variant="info" className="text-center">
              <Alert.Heading>Add Inventory Line</Alert.Heading>
              <form className="manual-entry-form">
                {Object.entries(editLine)
                  .filter(([key]) => key !== 'lineNo' && key !== 'packageUnit' && key !== 'hasFDAData')
                  .map(([key, value]) => {
                    // Map field names to user-friendly labels
                    const fieldLabels = {
                      packages: 'Quantity',
                      packageSize: 'Package Size',
                      itemName: 'Item Name',
                      ndc11: 'NDC-11',
                      labeler_name: 'Labeler',
                      dea_schedule: 'DEA Schedule',
                      pricePerUnit: 'Price per Unit',
                      pricingUnit: 'Pricing Unit',
                      unitsPerPackage: 'Units per Package',
                      packageUnit: 'Package Unit',
                      pricePerPackage: 'Price per Package',
                      totalPrice: 'Total Price',
                      isManualEntry: 'Manual Entry'
                    };
                    const label = fieldLabels[key] || key;
                    
                    // Special handling for pricePerUnit to show it's required when missing
                    const isRequired = key === 'pricePerUnit' && (!value || value === 0);

                    // Read-only fields that shouldn't be editable
                    const readOnlyFields = ['pricingUnit', 'pricePerPackage', 'totalPrice'];
                    // Lock NDC field if this item has FDA data
                    if (key === 'ndc11' && editLine?.hasFDAData) {
                      readOnlyFields.push('ndc11');
                    }
                    const isReadOnly = readOnlyFields.includes(key);

                    // Special rendering for packageSize - split into two fields
                    if (key === 'packageSize') {
                      const parsed = parsePackageSize(value);
                      const packageCount = parsed?.count || 1;
                      const packageUnit = parsed?.unit || 'units';

                      return (
                        <div key={key}>
                          <div className="form-field-row">
                            <label htmlFor={`edit-${key}-count`} className="form-label-fixed">
                              Package Size *:
                            </label>
                            <input
                              id={`edit-${key}-count`}
                              type="number"
                              value={packageCount}
                              onChange={e => {
                                const inputValue = e.target.value;
                                const newCount = inputValue === '' ? '' : parseInt(inputValue) || 0;
                                const newPackageSize = inputValue === '' ? '' : `${newCount || 1} ${packageUnit}`;
                                setEditLine(l => ({
                                  ...l,
                                  packageSize: newPackageSize,
                                  unitsPerPackage: newCount || 1,
                                  packageUnit
                                }));
                              }}
                              className="scan-input-flex"
                              min="1"
                            />
                          </div>
                          <div className="form-field-row-with-margin">
                            <label htmlFor={`edit-${key}-unit`} className="form-label-fixed">
                              Package Unit *:
                            </label>
                            <input
                              id={`edit-${key}-unit`}
                              type="text"
                              value={packageUnit}
                              onChange={e => {
                                const newUnit = e.target.value;
                                const newPackageSize = newUnit === '' ? '' : `${packageCount || 1} ${newUnit || 'units'}`;
                                setEditLine(l => ({
                                  ...l,
                                  packageSize: newPackageSize,
                                  packageUnit: newUnit
                                }));
                              }}
                              className="scan-input-flex"
                              placeholder="tablets"
                            />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={key}>
                        <div className="form-field-row">
                          <label htmlFor={`edit-${key}`} className="form-label-fixed">
                            {label}{isRequired && ' *'}:
                          </label>
                          <input
                            id={`edit-${key}`}
                            type={typeof value === 'number' ? 'number' : 'text'}
                            value={value ?? ''}
                            onChange={e => {
                              if (!isReadOnly) {
                                const v = typeof value === 'number' ? Number(e.target.value) : e.target.value;

                                // Validate NDC field using centralized validation
                                if (key === 'ndc11') {
                                  const isManual = editLine?.isManualEntry;
                                  let validation;
                                  if (isManual || ndcService.utils.isCustomCode(v)) {
                                    validation = ndcService.utils.validateManualCode(v);
                                  } else {
                                    validation = ndcService.utils.validateStandardNDC(v);
                                  }

                                  // Store validation result (could be used for styling)
                                  setEditLine(l => ({
                                    ...l,
                                    [key]: v,
                                    [`${key}_validation`]: validation
                                  }));
                                } else {
                                  setEditLine(l => ({ ...l, [key]: v }));
                                }
                              }
                            }}
                            readOnly={isReadOnly}
                            className={(() => {
                              if (key === 'ndc11' && editLine?.[`${key}_validation`] && !editLine[`${key}_validation`].isValid) {
                                return 'scan-input-error';
                              }
                              if (isReadOnly) {
                                return 'scan-input-readonly';
                              }
                              return isRequired ? 'scan-input-required' : 'scan-input-optional';
                            })()}
                            placeholder={isRequired ? 'Enter price per unit' : ''}
                          />
                        </div>
                        {/* Show validation error message for NDC field */}
                        {key === 'ndc11' && editLine?.[`${key}_validation`] && !editLine[`${key}_validation`].isValid && (
                          <div className="validation-error-message">
                            {editLine[`${key}_validation`].message}
                          </div>
                        )}
                        {/* Show FDA lock message for NDC field */}
                        {key === 'ndc11' && editLine?.hasFDAData && (
                          <Form.Text className="text-muted form-text-spacing">
                            🔒 NDC locked - FDA verified item
                          </Form.Text>
                        )}
                      </div>
                    );
                  })}
              </form>
            </Alert>
            <form onSubmit={handleSubmit} className="main-form">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="submit-button-container"
              >
                {submitting ? "Adding to Report..." : "Add to Report"}
              </Button>
              {submitStatus && (
                <Alert variant={submitStatus.ok ? "success" : "danger"} className="alert-spacing-top">
                  {submitStatus.msg}
                </Alert>
              )}
              {validationErrors.length > 0 && (
                <Alert variant="warning" className="alert-spacing-top">
                  <Alert.Heading>Validation Errors:</Alert.Heading>
                  <ul className="mb-0">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </form>
          </div>
        )}
            
            <CurrentItemsTable
              selectedClient={selectedClient}
            />
            </div>
          </>
        )}
      </div>
    </Wrapper>
  );
};

export default ScanOut;