// src/Components/Scanning/ScanOut.js
import React, { useContext, useEffect, useState } from "react";
import Wrapper from "../Layout/Wrapper";
import { Alert, Button } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useZxingScanner } from "./UseZxingScanner";
import { createNdcService } from "../../Services/NdcService";
import { createPriceService } from "../../Services/PriceService";
import { FDAResult } from "../../Models/FdaResultModel";
import { createForm222Line, validateForm222Line } from "../../Models/Form222Model";
import { ClientContext } from "../../context/ClientContext";
import CurrentItemsTable from "./CurrentItemsTable";
import ManualEntryModal from "./ManualEntryModal";
import apiService from "../../Services/ApiService";
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
    const validation = validateForm222Line(editLine);
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
  const handleManualSubmit = async (formData) => {
    // Create a Form222 line from manual data
    const manualLine = createForm222Line(
      {
        brandName: formData.itemName, // Use itemName as brandName for Form222
        genericName: "", // No separate generic name
        ndcNumber: formData.ndcNumber,
        packageSize: formData.packageSize,
        labeler_name: formData.labeler_name
      },
      formData.pricePerEA ? {
        nadac_per_unit: parseFloat(formData.pricePerEA)
      } : null,
      1, // Default package count to 1
      1  // Default total quantity ordered to 1
    );
    
    // Mark this as a manual entry
    manualLine.isManualEntry = true;
    
    setEditLine(manualLine);
  };

  const { control, isRunning, error } = useZxingScanner(
    "scannerVideo",
    (text) => {
      setBarcode(text);
      control?.stop?.(); // single-shot behavior
    }
  );

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      if (!barcode) {
        setResult(null);
        setEditLine(null);
        return;
      }
      
      setResult({ valid: true, message: "Scanning..." });
      
      const norm = ndcService.normalizeScan(barcode);
      if (!norm.ok) {
        setResult({ 
          valid: false, 
          message: norm.reason || "Unrecognized barcode format.", 
          allowManualEntry: true  // Allow manual entry even for invalid barcodes
        });
        setEditLine(null);
        return;
      }
      
      let msg = `Valid NDC-11: ${norm.ndc11}`;
      
      try {
        // First check if this is a cached manual entry
        const manualEntry = await apiService.getManualEntry(barcode);
        
        if (manualEntry && !ignore) {
          msg += `\n🔧 Manual Entry (cached)`;
          msg += `\nItem: ${manualEntry.itemName}`;
          if (manualEntry.packageSize) msg += `\nPackage: ${manualEntry.packageSize}`;
          if (manualEntry.pricePerEA) msg += `\nPrice per EA: $${manualEntry.pricePerEA}`;
          if (manualEntry.labeler_name) msg += `\nLabeler: ${manualEntry.labeler_name}`;
          
          // Create Form222 line from cached manual entry
          const manualLine = createForm222Line(
            {
              brandName: manualEntry.itemName, // Use itemName as brandName
              genericName: "",
              ndcNumber: manualEntry.ndcNumber,
              packageSize: manualEntry.packageSize,
              labeler_name: manualEntry.labeler_name
            },
            manualEntry.pricePerEA ? {
              nadac_per_unit: parseFloat(manualEntry.pricePerEA)
            } : null,
            1, // Default package count to 1
            1  // Default total quantity ordered to 1
          );
          
          // Mark as manual entry
          manualLine.isManualEntry = true;
          
          setEditLine(manualLine);
          setResult({ valid: true, message: msg });
          return;
        }
        
        // If no manual entry found, proceed with FDA/pricing lookup
        // Batch the async operations
        const [fdaResponse, priceResponse] = await Promise.allSettled([
          ndcService.verify(norm.ndc11),
          (async () => {
            const fda = await ndcService.verify(norm.ndc11);
            if (fda.ok) {
              const fdaResult = fda.raw instanceof FDAResult ? fda.raw : new FDAResult(fda.raw);
              return await fdaResult.getPrice(priceService, norm.ndc11);
            }
            return { ok: false, reason: "FDA verification failed" };
          })()
        ]);
        
        if (ignore) return;
        
        const fda = fdaResponse.status === 'fulfilled' ? fdaResponse.value : { ok: false };
        const price = priceResponse.status === 'fulfilled' ? priceResponse.value : { ok: false };
        
        if (fda.ok) {
          const fdaResult = fda.raw instanceof FDAResult ? fda.raw : new FDAResult(fda.raw);
          msg += fdaResult.brand_name ? `\nFDA: ${fdaResult.brand_name} (${fdaResult.generic_name || ''})` : '';
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
          const nadacRow = price.ok ? price.row : null;
          const formLine = createForm222Line(draft, nadacRow, 1, 1);
          setEditLine(formLine);
        } else {
          msg += `\nFDA: Not found or not recognized.`;
          setEditLine(null);
        }
        setResult({ valid: true, message: msg, allowManualEntry: !fda.ok });
      } catch (e) {
        if (!ignore) {
          msg += `\nError: ${e.message}`;
          setResult({ valid: false, message: msg, allowManualEntry: true }); // Allow manual entry on API errors with valid NDC/GTIN
          setEditLine(null);
        }
      }
    };

    fetchData();

    return () => { ignore = true; };
  }, [barcode]);

  return (
    <Wrapper>
      <h1 style={{ textAlign: "center" }}>Scan Barcode</h1>
      
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <video
          id="scannerVideo"
          muted
          autoPlay
          playsInline
          style={{
            width: 480,
            height: 320,
            margin: "0 auto 12px auto",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 2px 12px #0002",
            background: "#000",
            objectFit: "cover",
          }}
        />

        <div style={{ marginBottom: 12 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => control?.stop?.()}
            disabled={!isRunning || !control}
          >
            Stop
          </Button>{" "}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reset
          </Button>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            marginBottom: 16,
          }}
        >
          <input
            type="text"
            placeholder="Scan or enter NDC-11"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            autoFocus
            style={{
              width: 300,
              padding: 8,
              fontSize: 18,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginBottom: 8,
              textAlign: "center",
            }}
          />
        </form>

        {barcode && (
          <Alert variant="dark" className="text-center" style={{ width: 320 }}>
            <Alert.Heading>Barcode</Alert.Heading>
            <p style={{ wordBreak: "break-all" }}>{barcode}</p>
          </Alert>
        )}


        {result && (
          <Alert
            variant={result.valid ? "success" : "danger"}
            className="text-center"
            style={{ width: 320, whiteSpace: 'pre-line' }}
          >
            {result.message}
            {result.allowManualEntry && !showManualEntryModal && (
              <div style={{ marginTop: 12 }}>
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
          <div style={{ width: 340, marginTop: 8 }}>
            <Alert variant="info" className="text-center">
              <Alert.Heading>Edit Form 222 Line</Alert.Heading>
              <form style={{ textAlign: 'left', fontSize: 13, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(editLine)
                  .filter(([key]) => key !== 'lineNo')
                  .map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label htmlFor={`edit-${key}`} style={{ minWidth: 110 }}>{key}:</label>
                      <input
                        id={`edit-${key}`}
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value ?? ''}
                        onChange={e => {
                          const v = typeof value === 'number' ? Number(e.target.value) : e.target.value;
                          setEditLine(l => ({ ...l, [key]: v }));
                        }}
                        style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                      />
                    </div>
                  ))}
              </form>
            </Alert>
            <form onSubmit={handleSubmit} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                style={{ marginTop: 4 }}
              >
                {submitting ? "Adding to Report..." : "Add to Report"}
              </Button>
              {submitStatus && (
                <Alert variant={submitStatus.ok ? "success" : "danger"} style={{ marginTop: 8, marginBottom: 0 }}>
                  {submitStatus.msg}
                </Alert>
              )}
              {validationErrors.length > 0 && (
                <Alert variant="warning" style={{ marginTop: 8, marginBottom: 0 }}>
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

        {error && (
          <Alert variant="warning" className="text-center" style={{ width: 320, marginTop: 8 }}>
            {error}
          </Alert>
        )}
      </div>

      <CurrentItemsTable
        currentReport={currentReport}
        selectedClient={selectedClient}
      />
        </>
      )}
    </Wrapper>
  );
};

export default ScanOut;