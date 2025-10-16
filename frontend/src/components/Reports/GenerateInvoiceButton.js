import React, { useState } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import { Receipt } from 'react-bootstrap-icons';
import apiService from '../../services/ApiService';
import { getClientName } from '../../utils/clientUtils';

const GenerateInvoiceButton = ({ clientId, reportId, report, variant = "outline-info", size = "sm", className = "" }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  // Calculate statistics for the report
  const getReportStats = () => {
    if (!report || !report.lineItems) {
      return { total: 0, controlled: 0, cii: 0, nonControlled: 0 };
    }

    const stats = {
      total: report.lineItems.length,
      controlled: 0,
      cii: 0,
      ciii: 0,
      civ: 0,
      cv: 0,
      nonControlled: 0
    };

    report.lineItems.forEach(item => {
      if (item.dea_schedule) {
        stats.controlled++;
        switch (item.dea_schedule) {
          case 'CII':
            stats.cii++;
            break;
          case 'CIII':
            stats.ciii++;
            break;
          case 'CIV':
            stats.civ++;
            break;
          case 'CV':
            stats.cv++;
            break;
          default:
            break;
        }
      } else {
        stats.nonControlled++;
      }
    });

    return stats;
  };

  const generatePDF = async () => {
    if (!clientId || !reportId) {
      setError('Missing client or report information');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Use axios directly for blob response handling
      const response = await apiService.client.post(`/generate-invoice/${clientId}/${reportId}`, {}, {
        responseType: 'blob' // Important for PDF download
      });

      // Get the PDF blob from the response
      const blob = response.data;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename based on client and report info
      const clientName = getClientName(report?.client, 'Client');
      const reportDate = new Date().toISOString().split('T')[0];
      link.download = `Invoice-${clientName.replace(/[^a-zA-Z0-9]/g, '-')}-${reportId}-${reportDate}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setShowModal(false);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);

      // Handle API error responses
      if (error.response?.data) {
        try {
          // Try to parse error message from blob response
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          setError(errorData.error || errorData.details || 'Failed to generate invoice PDF');
        } catch {
          setError(error.response.statusText || 'Failed to generate invoice PDF');
        }
      } else {
        setError(error.message || 'Failed to generate invoice PDF');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleButtonClick = () => {
    if (!report || !report.lineItems || report.lineItems.length === 0) {
      setError('Cannot generate invoice: No items found in this report.');
      setShowModal(true);
      return;
    }
    generatePDF();
  };

  const stats = getReportStats();
  const buttonTitle = `Generate Invoice (${stats.total} items${stats.controlled > 0 ? `, ${stats.controlled} controlled` : ''})`;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleButtonClick}
        disabled={isGenerating || !report || !report.lineItems || report.lineItems.length === 0}
        className={className}
        title={(!report || !report.lineItems || report.lineItems.length === 0) ? "No items in report" : buttonTitle}
      >
        {isGenerating ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Generating...
          </>
        ) : (
          <>
            <Receipt className="me-1" />
            Invoice
            {stats.total > 0 && (
              <Badge bg="light" text="dark" className="ms-1">{stats.total}</Badge>
            )}
          </>
        )}
      </Button>

      {/* Error Modal for empty reports */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Receipt className="me-2" />
            Cannot Generate Invoice
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>Error:</strong> {error || "This report has no items. Please add items to this report before generating the invoice PDF."}
          </Alert>

          {stats.total > 0 && (
            <div className="mt-3">
              <h6>Report Statistics:</h6>
              <ul>
                <li>Total Items: {stats.total}</li>
                {stats.controlled > 0 && (
                  <>
                    <li>Controlled Substances: {stats.controlled}</li>
                    {stats.cii > 0 && <li className="ms-3">Schedule II (CII): {stats.cii}</li>}
                    {stats.ciii > 0 && <li className="ms-3">Schedule III (CIII): {stats.ciii}</li>}
                    {stats.civ > 0 && <li className="ms-3">Schedule IV (CIV): {stats.civ}</li>}
                    {stats.cv > 0 && <li className="ms-3">Schedule V (CV): {stats.cv}</li>}
                  </>
                )}
                <li>Non-Controlled: {stats.nonControlled}</li>
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GenerateInvoiceButton;
