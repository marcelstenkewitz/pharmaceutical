import React, { useContext, useEffect, useState } from "react";
import Wrapper from "../Layout/Wrapper";
import { Alert, Button } from "react-bootstrap";
import { useZxingScanner } from "./UseZxingScanner";
import { createNdcService } from "../../Services/NdcService";
import { createPriceService } from "../../Services/PriceService";
import { FDAResult } from "../../Models/FdaResultModel";
import { createForm222Line, validateForm222Line } from "../../Models/Form222Model";
import { ClientContext } from "../../context/ClientContext";
import CurrentItemsTable from "../Scanning/CurrentItemsTable"; // Use the proper CurrentItemsTable
import "./checking.css";

const ndcService = createNdcService();
const priceService = createPriceService();

const CheckOut = () => {
  const { 
    selectedClient, 
    currentReport, 
    sessionReport,
    createNewReport,
    addLineItemToReport: addLineItemToReportContext
  } = useContext(ClientContext);
  
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState(null);
  const [editLine, setEditLine] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Initialize a new report for the selected client
  useEffect(() => {
    if (selectedClient && !currentReport) {
      // Context will handle initializing the report state
    }
  }, [selectedClient, currentReport]);

  // Handle submit of Form222 line to selected client
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editLine || !selectedClient) {
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
      let targetReportId = sessionReport?.id || currentReport?.reportId;
      
      // Get the client ID for API calls
      const clientId = selectedClient && typeof selectedClient === 'object' 
        ? selectedClient.id 
        : selectedClient;

      // Create a new report if we don't have one
      if (!targetReportId) {
        const newReport = await createNewReport(clientId);
        targetReportId = newReport.id;
      }

      // Add the line item using context method
      await addLineItemToReportContext(clientId, editLine, targetReportId);

      setSubmitStatus({ ok: true, msg: "Item added to the report successfully." });
      setEditLine(null);
      setBarcode("");
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
        setResult({ valid: false, message: norm.reason || "Unrecognized barcode format." });
        setEditLine(null);
        return;
      }
      
      let msg = `Valid NDC-11: ${norm.ndc11}`;
      try {
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
        setResult({ valid: true, message: msg });
      } catch (e) {
        if (!ignore) {
          msg += `\nError: ${e.message}`;
          setResult({ valid: false, message: msg });
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
      
      {currentReport?.reportId && (
        <Alert variant="info" className="text-center mb-3">
          <strong>Adding items to existing report:</strong> {currentReport.reportId}
        </Alert>
      )}
      
      {sessionReport && !currentReport?.reportId && (
        <Alert variant="success" className="text-center mb-3">
          <strong>New session report created:</strong> {sessionReport.id}
        </Alert>
      )}

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
          </Alert>
        )}


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
    </Wrapper>
  );
};

export default CheckOut;