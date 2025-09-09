import React, { useContext, useEffect, useState, useCallback } from 'react';
import { ClientContext } from '../../context/ClientContext';
import Wrapper from '../Layout/Wrapper';
import { Alert, Card, Badge, Button, Modal } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../Services/ApiService';
import GenerateForm222Button from './GenerateForm222Button';
import './reports.css';

const Reports = () => {
  const { 
    selectedClient, 
    clients, 
    reports, 
    setCurrentReport,
    loadReports,
    loadClients,
    deleteReport,
    setSelectedClient
  } = useContext(ClientContext);
  
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [labelers, setLabelers] = useState([]);
  const navigate = useNavigate();
  const { clientId: urlClientId } = useParams();

  // Get client info - prioritize URL clientId over selectedClient
  const effectiveClientId = urlClientId || (selectedClient && typeof selectedClient === 'object' 
    ? selectedClient.id 
    : selectedClient);
  
  const clientInfo = effectiveClientId 
    ? clients.find(c => c.id === effectiveClientId) 
    : null;
  
  // Get the client ID for API calls
  const clientId = effectiveClientId;

  // Function to refresh reports list (now handled by context)
  const refreshReports = useCallback(() => {
    if (clientId) {
      loadReports(clientId);
    }
  }, [clientId, loadReports]);

  // Function to load labelers
  const loadLabelers = useCallback(async () => {
    try {
      const response = await apiService.getLabelers();
      setLabelers(response.labelers || []);
    } catch (error) {
      console.error('Failed to load labelers:', error);
      setLabelers([]);
    }
  }, []);

  // Function to get return instructions for a labeler
  const getReturnInstructions = useCallback((labelerName) => {
    if (!labelerName || !labelers.length) return 'N/A';
    const labeler = labelers.find(l => l.labeler_name === labelerName);
    return labeler ? labeler.return_instructions : 'Contact manufacturer for return instructions';
  }, [labelers]);

  // Load initial data
  useEffect(() => {
    loadClients(); // Ensure clients are loaded
    loadLabelers(); // Load labelers for return instructions
    if (clientId) {
      refreshReports(); // Load reports for selected client
    }
  }, [clientId, refreshReports, loadClients, loadLabelers]);

  // Set selected client from URL if not already selected
  useEffect(() => {
    if (urlClientId && clients.length > 0 && (!selectedClient || (typeof selectedClient === 'string' && selectedClient !== urlClientId))) {
      const clientFromUrl = clients.find(c => c.id === urlClientId);
      if (clientFromUrl) {
        setSelectedClient(clientFromUrl);
      }
    }
  }, [urlClientId, clients, selectedClient, setSelectedClient]);

  // Refresh reports when the page gets focus (user returns from scanning)
  useEffect(() => {
    const handleFocus = () => {
      refreshReports();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshReports]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handleAddItemsToReport = (report) => {
    // Set up context for adding items to this specific report
    setCurrentReport({
      id: report.id,
      clientId: clientId,
      items: report.lineItems || []
    });
    // Navigate to scanning page with client and report parameters
    navigate(`/scanning/client/${clientId}/report/${report.id}`);
  };

  const handleCreateNewReport = () => {
    // Clear any existing report context to ensure a new report is created
    setCurrentReport(null);
    // Navigate to scanning page with client parameter
    navigate(`/scanning/client/${clientId}`);
  };

  const handleDeleteReport = (report) => {
    setReportToDelete(report);
    setShowDeleteModal(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete || !clientId) return;
    
    try {
      await deleteReport(clientId, reportToDelete.id);
      setShowDeleteModal(false);
      setReportToDelete(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
      // Error handling is managed by the context
    }
  };

  const cancelDeleteReport = () => {
    setShowDeleteModal(false);
    setReportToDelete(null);
  };

  if (!clientId) {
    return (
      <Wrapper>
        <Alert variant="warning">No client selected. Please select a client first.</Alert>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="reports-container">
        <div className="d-flex justify-content-between align-items-center mb-4 report-header">
          <h1>Form 222 Reports</h1>
          <div className="d-flex gap-2 align-items-center">
            {clientInfo && (
              <Badge bg="primary" className="report-badge me-2 fs-5 px-3 py-2">
                {clientInfo.businessName || clientInfo.name}
              </Badge>
            )}
            <Button 
              variant="success" 
              size="sm"
              onClick={handleCreateNewReport}
            >
              Create New Report
            </Button>
          </div>
        </div>
        
        {reports.length === 0 ? (
          <Alert variant="info">No reports available for this client.</Alert>
        ) : (
          <div>
            <Alert variant="success" className="mb-4">
              Found {reports.length} report{reports.length !== 1 ? 's' : ''} for this client.
            </Alert>
            
            {reports.map((report, reportIndex) => (
              <Card key={report.id} className="mb-4">
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">Report #{reportIndex + 1}</h5>
                      <div className="report-meta text-muted small">
                        <strong>Created:</strong> {formatDate(report.createdAt)} | 
                        <strong> ID:</strong> {report.id} | 
                        <strong> Items:</strong> {report.lineItems?.length || 0}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => handleAddItemsToReport(report)}
                      >
                        Edit Items
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        View Details
                      </Button>
                      <GenerateForm222Button 
                        clientId={clientId}
                        reportId={report.id}
                        report={report}
                        variant="outline-info"
                        size="sm"
                      />
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDeleteReport(report)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body>
                  {report.lineItems && report.lineItems.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-striped table-hover mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th style={{ width: '6%' }}>Line #</th>
                            <th style={{ width: '25%' }}>Item Name</th>
                            <th style={{ width: '12%' }}>NDC-11</th>
                            <th style={{ width: '15%' }}>Package Size</th>
                            <th style={{ width: '8%' }}>Quantity</th>
                            <th style={{ width: '12%' }}>Labeler</th>
                            <th style={{ width: '22%' }}>Notes for Return</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.lineItems.map((item) => (
                            <tr key={item.id}>
                              <td className="fw-bold">{item.lineNo}</td>
                              <td>
                                <div className="text-truncate d-flex align-items-center" style={{ maxWidth: '300px' }} title={item.itemName}>
                                  {item.itemName}
                                  {item.isManualEntry && (
                                    <span 
                                      className="badge bg-warning text-dark ms-2" 
                                      style={{ fontSize: '0.7em' }}
                                      title="Manual Entry"
                                    >
                                      🔧 Manual
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <code className="small">{item.ndc11}</code>
                              </td>
                              <td>{item.packageSize}</td>
                              <td className="text-center">
                                <Badge bg="secondary">{item.packages}</Badge>
                              </td>
                              <td>{item.labeler_name || 'N/A'}</td>
                              <td style={{ maxWidth: '200px', fontSize: '0.85em' }}>
                                <div className="text-truncate" title={getReturnInstructions(item.labeler_name)}>
                                  {getReturnInstructions(item.labeler_name)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Alert variant="warning" className="mb-0">
                      This report has no line items yet. Click "Edit Items" to start scanning.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        )}      {/* Report Details Modal */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Report Details - {selectedReport?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <div>
              <Card className="mb-3">
                <Card.Header>
                  <h5 className="mb-0">Report Information</h5>
                </Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Report ID:</strong> {selectedReport.id}</p>
                      <p><strong>Created:</strong> {formatDate(selectedReport.createdAt)}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Client:</strong> {clientInfo?.businessName || clientInfo?.name}</p>
                      <p><strong>Total Line Items:</strong> {selectedReport.lineItems?.length || 0}</p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              
              {selectedReport.lineItems && selectedReport.lineItems.length > 0 && (
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">Line Items</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Line #</th>
                            <th>Item Name</th>
                            <th>NDC-11</th>
                            <th>Package Size</th>
                            <th>Quantity</th>
                            <th>Labeler</th>
                            <th>Notes for Return</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.lineItems.map((item) => (
                            <tr key={item.id}>
                              <td>{item.lineNo}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  {item.itemName}
                                  {item.isManualEntry && (
                                    <span 
                                      className="badge bg-warning text-dark ms-2" 
                                      style={{ fontSize: '0.7em' }}
                                      title="Manual Entry"
                                    >
                                      🔧 Manual
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>{item.ndc11}</td>
                              <td>{item.packageSize}</td>
                              <td>{item.packages}</td>
                              <td>{item.labeler_name || 'N/A'}</td>
                              <td style={{ fontSize: '0.85em', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                {getReturnInstructions(item.labeler_name)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              {selectedReport && (
                <GenerateForm222Button 
                  clientId={clientId}
                  reportId={selectedReport.id}
                  report={{ ...selectedReport, client: clientInfo }}
                  variant="outline-info"
                  size="sm"
                />
              )}
            </div>
            <Button variant="secondary" onClick={() => setShowReportModal(false)}>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={cancelDeleteReport} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reportToDelete && (
            <div>
              <p>Are you sure you want to delete this report?</p>
              <div className="alert alert-warning">
                <strong>Report Details:</strong>
                <br />
                <strong>ID:</strong> {reportToDelete.id}
                <br />
                <strong>Created:</strong> {formatDate(reportToDelete.createdAt)}
                <br />
                <strong>Line Items:</strong> {reportToDelete.lineItems?.length || 0}
              </div>
              <p className="text-danger">
                <strong>Warning:</strong> This action cannot be undone. All line items in this report will be permanently deleted.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDeleteReport}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteReport}>
            Delete Report
          </Button>
        </Modal.Footer>
      </Modal>
      </div>
    </Wrapper>
  );
};

export default Reports;
