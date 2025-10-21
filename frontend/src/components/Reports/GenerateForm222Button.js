import React, { useState } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import { FilePdfFill, ExclamationTriangleFill } from 'react-bootstrap-icons';
import apiService from '../../services/ApiService';
import { getClientName } from '../../utils/clientUtils';

const GenerateForm222Button = ({ clientId, reportId, report, variant = "outline-danger", size = "sm", className = "" }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [error, setError] = useState(null);

  // Get Schedule I and II items from the report (Form 222 required)
  const getForm222Items = () => {
    if (!report || !report.lineItems) return [];
    return report.lineItems.filter(item => 
      item.dea_schedule === 'CI' || item.dea_schedule === 'CII'
    );
  };

  const form222Items = getForm222Items();
  const hasForm222Items = form222Items.length > 0;
  const hasNonForm222Items = report?.lineItems && report.lineItems.length > form222Items.length;

  const generatePDF = async () => {
    if (!clientId || !reportId) {
      setError('Missing client or report information');
      return;
    }

    if (!hasForm222Items) {
      setError('No Schedule I or II controlled substances found in this report.');
      setShowModal(true);
      return;
    }

    // Check if there are non-Form 222 items that will be excluded
    if (hasNonForm222Items) {
      setShowWarningModal(true);
      return; // User must confirm to proceed
    }

    proceedWithGeneration();
  };

  const proceedWithGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setShowWarningModal(false);

    try {
      // Use axios directly for blob response handling
      const response = await apiService.client.post(`/generate-form222/${clientId}/${reportId}`, {
        filterCII: true // Tell backend to only include CI and CII items
      }, {
        responseType: 'blob' // Important for PDF download
      });

      // Get the PDF blob from the response
      const blob = response.data;

      // Generate filename based on client and report info
      const clientName = getClientName(report?.client, 'Client');
      const reportDate = new Date().toISOString().split('T')[0];
      const filename = `DEA-Form-222-${clientName.replace(/[^a-zA-Z0-9]/g, '-')}-${reportId}-${reportDate}.pdf`;

      // Use the File System Access API to show Save As dialog
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'PDF Files',
              accept: { 'application/pdf': ['.pdf'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err) {
          // User cancelled or API not supported, fall back to regular download
          if (err.name !== 'AbortError') {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
          }
        }
      } else {
        // Fallback for browsers that don't support File System Access API
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Handle API error responses
      if (error.response?.data) {
        try {
          // Try to parse error message from blob response
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          setError(errorData.error || errorData.details || 'Failed to generate PDF');
        } catch {
          setError(error.response.statusText || 'Failed to generate PDF');
        }
      } else {
        setError(error.message || 'Failed to generate PDF');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleButtonClick = () => {
    if (!report || !report.lineItems || report.lineItems.length === 0) {
      setError('Cannot generate Form 222: No items found in this report.');
      setShowModal(true);
      return;
    }
    
    if (!hasForm222Items) {
      setError('Cannot generate Form 222: No Schedule I or II controlled substances found in this report. Form 222 is only required for Schedule I and II drugs.');
      setShowModal(true);
      return;
    }
    
    generatePDF();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleButtonClick}
        disabled={isGenerating}
        className={className}
        title={!hasForm222Items ? "No Schedule I or II items in report" : `Generate DEA Form 222 (${form222Items.length} CI/CII items)`}
      >
        {isGenerating ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Generating...
          </>
        ) : (
          <>
            <FilePdfFill className="me-1" />
            Form 222
            {hasForm222Items && (
              <Badge bg="light" text="dark" className="ms-1">CI/CII: {form222Items.length}</Badge>
            )}
          </>
        )}
      </Button>

      {/* Error Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FilePdfFill className="me-2" />
            Cannot Generate Form 222
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>Error:</strong> {error || "This report has no Schedule I or II items. Form 222 is required only for Schedule I and II controlled substances."}
          </Alert>
          {report?.lineItems && report.lineItems.length > 0 && (
            <div className="mt-3">
              <p><strong>Report Summary:</strong></p>
              <ul>
                <li>Total items: {report.lineItems.length}</li>
                <li>Schedule I/II items: {form222Items.length}</li>
                {report.lineItems.length - form222Items.length > 0 && (
                  <li>Non-CI/CII items: {report.lineItems.length - form222Items.length}</li>
                )}
              </ul>
              {form222Items.length === 0 && (
                <Alert variant="info" className="mt-2">
                  <strong>Note:</strong> DEA Form 222 is only required for Schedule I and II controlled substances. 
                  Use the Inventory Report button for general inventory tracking.
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Warning Modal for mixed items */}
      <Modal show={showWarningModal} onHide={() => setShowWarningModal(false)}>
        <Modal.Header closeButton className="bg-warning">
          <Modal.Title>
            <ExclamationTriangleFill className="me-2" />
            Form 222 - Schedule II Items Only
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>Important:</strong> This report contains both Form 222 required items and other items.
          </Alert>
          <p>
            DEA Form 222 will only include the <strong>{form222Items.length} Schedule I and II</strong> controlled substances.
            The remaining <strong>{report?.lineItems?.length - form222Items.length} non-CI/CII items</strong> will be excluded.
          </p>
          <p className="mb-0">
            <strong>Do you want to proceed with generating Form 222 for CII items only?</strong>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWarningModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={proceedWithGeneration}>
            Generate Form 222 (CI/CII Only)
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GenerateForm222Button;
