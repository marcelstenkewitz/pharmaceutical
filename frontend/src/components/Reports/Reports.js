import React, { useContext, useEffect, useState, useCallback } from 'react';
import { ClientContext } from '../../context/ClientContext';
import Wrapper from '../Layout/Wrapper';
import { Alert, Card, Badge, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/ApiService';
import GenerateForm222Button from './GenerateForm222Button';
import GenerateInventoryButton from './GenerateInventoryButton';
import GenerateInvoiceButton from './GenerateInvoiceButton';
import ClientBadge from '../Common/ClientBadge';
import ClientName from '../Common/ClientName';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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

  // Add original report numbers to preserve them after filtering
  // Since reports are now reversed (newest first), assign numbers accordingly
  const reportsWithNumbers = reports.map((report, index) => ({
    ...report,
    originalReportNumber: reports.length - index
  }));

  // Filter reports based on search criteria
  const filteredReports = reportsWithNumbers.filter(report => {
    const reportDisplayNumber = String(report.originalReportNumber);
    const reportId = String(report.id).toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    // Check if search term is a pure number for exact report number matching
    const isNumberSearch = /^\d+$/.test(searchTerm);

    const matchesSearch = searchTerm === '' ||
      (isNumberSearch
        ? reportDisplayNumber === searchTerm
        : (reportDisplayNumber.includes(searchTerm) || reportId.includes(searchLower))
      );

    const reportDate = new Date(report.createdAt);
    const fromDateTime = fromDate ? new Date(fromDate) : null;
    const toDateTime = toDate ? new Date(toDate + 'T23:59:59') : null;

    const matchesDateRange = (!fromDateTime || reportDate >= fromDateTime) &&
                           (!toDateTime || reportDate <= toDateTime);

    return matchesSearch && matchesDateRange;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
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
    <Wrapper centerText={false}>
      <div className="reports-container">
        <div className="d-flex justify-content-between align-items-center mb-4 report-header">
          <h1>Inventory Reports</h1>
          <div className="d-flex gap-2 align-items-center">
            {clientInfo && (
              <ClientBadge client={clientInfo} className="report-badge me-2 fs-5 px-3 py-2" />
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

        {/* Search and Filter Section */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Search Reports</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Search Reports</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter report ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>From Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>To Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  onClick={clearFilters}
                  className="mb-3"
                  disabled={!searchTerm && !fromDate && !toDate}
                >
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {reports.length === 0 ? (
          <Alert variant="info">No reports available for this client.</Alert>
        ) : (
          <div>
            <Alert variant={filteredReports.length === 0 ? "warning" : "success"} className="mb-4">
              {filteredReports.length === 0 ?
                "No reports match your search criteria." :
                `Found ${filteredReports.length} of ${reports.length} report${filteredReports.length !== 1 ? 's' : ''} for this client.`
              }
            </Alert>

            {filteredReports.map((report, reportIndex) => (
              <Card key={report.id} className="mb-4">
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">Report #{report.originalReportNumber}</h5>
                      <div className="report-meta text-muted small">
                        <strong>Created:</strong> {formatDate(report.createdAt)} | 
                        <strong> ID:</strong> {report.id} | 
                        <strong> Items:</strong> {report.lineItems?.length || 0}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-3 justify-content-end report-action-buttons">
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleAddItemsToReport(report)}
                        className="report-btn"
                      >
                        Edit Items
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                        className="report-btn"
                      >
                        View Details
                      </Button>
                      <GenerateInventoryButton
                        clientId={clientId}
                        reportId={report.id}
                        report={report}
                        variant="outline-success"
                        size="sm"
                        className="report-btn"
                      />
                      <GenerateInvoiceButton
                        clientId={clientId}
                        reportId={report.id}
                        report={report}
                        variant="outline-info"
                        size="sm"
                        className="report-btn"
                      />
                      <GenerateForm222Button
                        clientId={clientId}
                        reportId={report.id}
                        report={report}
                        variant="outline-danger"
                        size="sm"
                        className="report-btn"
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteReport(report)}
                        className="report-btn"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body>
                  {report.lineItems && report.lineItems.length > 0 ? (
                    <>
                      {/* Desktop/Tablet Table View */}
                      <div className="table-responsive">
                        <table className="table table-striped table-hover mb-0">
                          <thead className="table-dark">
                            <tr>
                              <th>Line #</th>
                              <th>Item Name</th>
                              <th>NDC-11</th>
                              <th className="hide-mobile">Package Details</th>
                              <th>Qty</th>
                              <th>Pricing</th>
                              <th>Total Price</th>
                              <th>DEA</th>
                              <th className="hide-mobile fw-bold">Manufacturer</th>
                              <th className="hide-mobile fw-bold">Notes for Return</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.lineItems.slice(0, 10).map((item) => (
                              <tr key={item.id}>
                                <td className="fw-bold">{item.lineNo}</td>
                                <td>
                                  <div className="text-truncate d-flex align-items-center item-name-truncate" title={item.itemName}>
                                    {item.itemName}
                                    {item.isManualEntry && (
                                      <span
                                        className="manual-entry-badge"
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
                                <td className="hide-mobile">
                                  <div>
                                    <strong className="text-primary">{item.packageSize}</strong>
                                    {item.unitsPerPackage && (
                                      <div className="small text-muted">
                                        {item.unitsPerPackage} units/pkg
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center">
                                  <Badge bg="secondary">{item.packages}</Badge>
                                </td>
                                <td className="text-end">
                                  <div>
                                    <strong>${item.pricePerUnit ? item.pricePerUnit.toFixed(4) : '0.0000'}</strong>
                                    <small className="text-muted d-block"><strong>per {item.pricingUnit || 'unit'}</strong></small>
                                  </div>
                                  <div className="mt-1">
                                    <strong className="text-info">${item.pricePerPackage ? item.pricePerPackage.toFixed(2) : '0.00'}</strong>
                                    <small className="text-muted d-block"><strong>per package</strong></small>
                                  </div>
                                </td>
                                <td className="text-end">
                                  <strong className="text-success">${item.totalPrice ? item.totalPrice.toFixed(2) : '0.00'}</strong>
                                </td>
                                <td>
                                  {item.dea_schedule ? (
                                    <Badge
                                      bg={item.dea_schedule === 'CII' ? 'danger' :
                                          item.dea_schedule === 'CIII' ? 'warning' :
                                          item.dea_schedule === 'CIV' || item.dea_schedule === 'CV' ? 'info' : 'secondary'}
                                      title={item.dea_schedule === 'CII' ? 'Schedule II - Requires Form 222' :
                                             `Schedule ${item.dea_schedule.substring(1)} Controlled Substance`}
                                    >
                                      {item.dea_schedule}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td className="hide-mobile">{item.labeler_name || 'N/A'}</td>
                                <td className="hide-mobile return-instructions-column">
                                  <div className="text-truncate" title={getReturnInstructions(item.labeler_name)}>
                                    {getReturnInstructions(item.labeler_name)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="mobile-table-card">
                        {report.lineItems.slice(0, 10).map((item) => (
                          <div key={item.id} className="mobile-item-card">
                            <div className="mobile-item-header">
                              Line #{item.lineNo}: {item.itemName}
                              {item.isManualEntry && (
                                <span
                                  className="manual-entry-badge"
                                >
                                  🔧 Manual
                                </span>
                              )}
                            </div>
                            <div className="mobile-item-detail">
                              <span className="mobile-item-label">NDC:</span>
                              <code className="small">{item.ndc11}</code>
                            </div>
                            <div className="mobile-item-detail">
                              <span className="mobile-item-label">Package:</span>
                              <div>
                                <strong className="text-primary">{item.packageSize}</strong>
                                {item.unitsPerPackage && (
                                  <div className="small text-muted">
                                    {item.unitsPerPackage} units per package
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mobile-item-detail">
                              <span className="mobile-item-label">Quantity:</span>
                              <Badge bg="secondary">{item.packages}</Badge>
                            </div>
                            <div className="mobile-item-detail">
                              <span className="mobile-item-label">Price/Unit:</span>
                              <strong>${item.pricePerUnit ? item.pricePerUnit.toFixed(4) : '0.0000'} per {item.pricingUnit || 'unit'}</strong>
                            </div>
                            {item.dea_schedule && (
                              <div className="mobile-item-detail">
                                <span className="mobile-item-label">DEA Schedule:</span>
                                <Badge
                                  bg={item.dea_schedule === 'CII' ? 'danger' :
                                      item.dea_schedule === 'CIII' ? 'warning' :
                                      item.dea_schedule === 'CIV' || item.dea_schedule === 'CV' ? 'info' : 'secondary'}
                                >
                                  {item.dea_schedule}
                                </Badge>
                              </div>
                            )}
                            <div className="mobile-item-detail">
                              <span className="mobile-item-label">Manufacturer:</span>
                              <span>{item.labeler_name || 'N/A'}</span>
                            </div>
                            <div className="mobile-item-detail">
                              <span className="mobile-item-label">Return Notes:</span>
                              <span className="return-instructions-text">
                                {getReturnInstructions(item.labeler_name)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* View More button if there are more than 10 items */}
                      {report.lineItems.length > 10 && (
                        <div className="text-center mt-3">
                          <Button
                            variant="outline-primary"
                            onClick={() => handleViewReport(report)}
                          >
                            View All {report.lineItems.length} Items
                          </Button>
                          <div className="text-muted small mt-2">
                            Showing first 10 of {report.lineItems.length} items
                          </div>
                        </div>
                      )}
                    </>
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
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Report Details - {selectedReport?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <div>
              <Card className="mb-3">
                <Card.Header>
                  <h5 className="mb-0">Report Overview</h5>
                </Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Report:</strong> #{selectedReport.originalReportNumber || reports.findIndex(r => r.id === selectedReport.id) + 1}</p>
                      <p><strong>Report ID:</strong> <code className="small">{selectedReport.id}</code></p>
                      <p><strong>Created:</strong> {formatDate(selectedReport.createdAt)}</p>
                      <p><strong>Total Line Items:</strong> <Badge bg="primary">{selectedReport.lineItems?.length || 0}</Badge></p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Client:</strong> <ClientName client={clientInfo} /></p>
                      {clientInfo?.streetAddress && (
                        <p><strong>Address:</strong> {clientInfo.streetAddress}, {clientInfo.city}, {clientInfo.state} {clientInfo.zipCode}</p>
                      )}
                      {clientInfo?.phoneNumber && <p><strong>Phone:</strong> {clientInfo.phoneNumber}</p>}
                    </div>
                  </div>
                  
                  {selectedReport.lineItems && selectedReport.lineItems.length > 0 && (() => {
                    const subtotal = selectedReport.lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
                    const invoicePercentage = clientInfo?.invoicePercentage || 0;
                    const invoiceProfit = subtotal * (invoicePercentage / 100);
                    const grandTotal = subtotal + invoiceProfit;

                    return (
                      <>
                        <hr />
                        <div className="row">
                          <div className="col-lg-2 col-md-4 col-6 mb-3">
                            <div className="text-center">
                              <div className="h4 text-primary mb-0">
                                {selectedReport.lineItems.reduce((sum, item) => sum + (item.packages || 0), 0)}
                              </div>
                              <small className="text-muted">Total Packages</small>
                            </div>
                          </div>
                          <div className="col-lg-2 col-md-4 col-6 mb-3">
                            <div className="text-center">
                              <div className="h4 text-success mb-0">
                                ${subtotal.toFixed(2)}
                              </div>
                              <small className="text-muted">Subtotal</small>
                            </div>
                          </div>
                          {invoicePercentage > 0 && (
                            <>
                              <div className="col-lg-2 col-md-4 col-6 mb-3">
                                <div className="text-center">
                                  <div className="h4 text-info mb-0">
                                    ${invoiceProfit.toFixed(2)}
                                  </div>
                                  <small className="text-muted">Invoice Profit ({invoicePercentage}%)</small>
                                </div>
                              </div>
                              <div className="col-lg-2 col-md-4 col-6 mb-3">
                                <div className="text-center">
                                  <div className="h4 text-success mb-0 fw-bold">
                                    ${grandTotal.toFixed(2)}
                                  </div>
                                  <small className="text-muted fw-bold">Grand Total</small>
                                </div>
                              </div>
                            </>
                          )}
                          <div className="col-lg-2 col-md-4 col-6 mb-3">
                            <div className="text-center">
                              <div className="h4 text-danger mb-0">
                                {selectedReport.lineItems.filter(item => item.dea_schedule === 'CII' || item.dea_schedule === 'CI').length}
                              </div>
                              <small className="text-muted schedule-text d-block">
                                <span className="d-none d-md-inline">Schedule I/II</span>
                                <span className="d-md-none">CI/CII</span>
                              </small>
                            </div>
                          </div>
                          <div className="col-lg-2 col-md-4 col-6 mb-3">
                            <div className="text-center">
                              <div className="h4 text-warning mb-0">
                                {selectedReport.lineItems.filter(item => item.isManualEntry).length}
                              </div>
                              <small className="text-muted">Manual Entries</small>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </Card.Body>
              </Card>
              
              {selectedReport.lineItems && selectedReport.lineItems.length > 0 && (
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">Line Items</h6>
                  </Card.Header>
                  <Card.Body>
                    {/* Desktop/Tablet Table View */}
                    <div className="table-responsive d-none d-md-block">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th style={{minWidth: '50px'}}>Line #</th>
                            <th style={{minWidth: '200px'}}>Item Name</th>
                            <th style={{minWidth: '110px'}}>NDC-11</th>
                            <th style={{minWidth: '100px'}}>Strength</th>
                            <th style={{minWidth: '180px', maxWidth: '220px'}}>Dosage Form</th>
                            <th style={{minWidth: '120px'}}>Package Details</th>
                            <th style={{minWidth: '70px'}}>Qty</th>
                            <th style={{minWidth: '90px'}} className="text-end">Price/Unit</th>
                            <th style={{minWidth: '100px'}} className="text-end">Total Price</th>
                            <th style={{minWidth: '70px'}}>DEA</th>
                            <th style={{minWidth: '120px'}} className="fw-bold">Wholesaler</th>
                            <th style={{minWidth: '150px'}} className="fw-bold">Manufacturer</th>
                            <th style={{minWidth: '200px'}} className="fw-bold">Notes for Return</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.lineItems.map((item) => (
                            <tr key={item.id}>
                              <td>{item.lineNo}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <span>{item.itemName}</span>
                                  {item.isManualEntry && (
                                    <span
                                      className="manual-entry-badge ms-2"
                                      title="Manual Entry"
                                    >
                                      🔧 Manual
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td><code className="small">{item.ndc11}</code></td>
                              <td>
                                {item.strength ? (
                                  <span className="text-primary fw-semibold">{item.strength}</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td style={{minWidth: '180px', maxWidth: '220px'}}>
                                {item.dosageForm ? (
                                  <span className="text-secondary" title={item.dosageForm}>
                                    {item.dosageForm}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <div>
                                  <strong className="text-primary">{item.packageSize}</strong>
                                  {item.unitsPerPackage && (
                                    <div className="small text-muted">
                                      {item.unitsPerPackage} units/pkg
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>{item.packages}</td>
                              <td className="text-end"><strong>${item.pricePerUnit ? item.pricePerUnit.toFixed(4) : '0.0000'}</strong></td>
                              <td className="text-end">
                                <strong className="text-success">${item.totalPrice ? item.totalPrice.toFixed(2) : '0.00'}</strong>
                              </td>
                              <td>
                                {item.dea_schedule ? (
                                  <Badge
                                    bg={item.dea_schedule === 'CII' ? 'danger' :
                                        item.dea_schedule === 'CIII' ? 'warning' :
                                        item.dea_schedule === 'CIV' || item.dea_schedule === 'CV' ? 'info' : 'secondary'}
                                    title={item.dea_schedule === 'CII' ? 'Schedule II - Requires Form 222' :
                                           `Schedule ${item.dea_schedule.substring(1)} Controlled Substance`}
                                  >
                                    {item.dea_schedule}
                                  </Badge>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>{clientInfo?.wholesaler || 'N/A'}</td>
                              <td>{item.labeler_name || 'N/A'}</td>
                              <td className="return-instructions-modal">
                                {getReturnInstructions(item.labeler_name)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="d-md-none">
                      {selectedReport.lineItems.map((item) => (
                        <div key={item.id} className="border rounded p-3 mb-3 bg-light">
                          <div className="mb-2">
                            <strong>Line #{item.lineNo}: </strong>
                            <span>{item.itemName}</span>
                            {item.isManualEntry && (
                              <span
                                className="badge bg-warning text-dark ms-2 manual-entry-badge"
                                title="Manual Entry"
                              >
                                🔧 Manual
                              </span>
                            )}
                          </div>
                          <div className="small">
                            <div className="mb-1"><strong>NDC:</strong> <code>{item.ndc11}</code></div>
                            {item.strength && (
                              <div className="mb-1">
                                <strong>Strength:</strong> <span className="text-primary fw-semibold">{item.strength}</span>
                              </div>
                            )}
                            {item.dosageForm && (
                              <div className="mb-1">
                                <strong>Dosage Form:</strong> <span className="text-secondary">{item.dosageForm}</span>
                              </div>
                            )}
                            <div className="mb-1">
                              <strong>Package:</strong>
                              <div>
                                <strong className="text-primary">{item.packageSize}</strong>
                                {item.unitsPerPackage && (
                                  <div className="small text-muted">
                                    {item.unitsPerPackage} units per package
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mb-1"><strong>Quantity:</strong> {item.packages}</div>
                            <div className="mb-1"><strong>Price/Unit:</strong> <strong>${item.pricePerUnit ? item.pricePerUnit.toFixed(4) : '0.0000'} per {item.pricingUnit || 'unit'}</strong></div>
                            <div className="mb-1"><strong>Total Price:</strong> <strong className="text-success">${item.totalPrice ? item.totalPrice.toFixed(2) : '0.00'}</strong></div>
                            <div className="mb-1">
                              <strong>DEA Schedule:</strong> {item.dea_schedule ? (
                                <Badge
                                  bg={item.dea_schedule === 'CII' ? 'danger' :
                                      item.dea_schedule === 'CIII' ? 'warning' :
                                      item.dea_schedule === 'CIV' || item.dea_schedule === 'CV' ? 'info' : 'secondary'}
                                  className="ms-1"
                                >
                                  {item.dea_schedule}
                                </Badge>
                              ) : (
                                <span className="text-muted">Not Controlled</span>
                              )}
                            </div>
                            <div className="mb-1"><strong>Wholesaler:</strong> {clientInfo?.wholesaler || 'N/A'}</div>
                            <div className="mb-1"><strong>Manufacturer:</strong> {item.labeler_name || 'N/A'}</div>
                            <div><strong>Return Notes:</strong> {getReturnInstructions(item.labeler_name)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100 flex-wrap gap-3 modal-footer-buttons">
            <div className="d-flex gap-3 flex-wrap">
              {selectedReport && (
                <>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => {
                      setShowReportModal(false);
                      handleAddItemsToReport(selectedReport);
                    }}
                    className="modal-action-btn"
                  >
                    Edit Items
                  </Button>
                  {selectedReport.lineItems && selectedReport.lineItems.length > 0 && (
                    <>
                      <GenerateInventoryButton
                        clientId={clientId}
                        reportId={selectedReport.id}
                        report={selectedReport}
                        variant="outline-success"
                        size="sm"
                        className="modal-action-btn"
                      />
                      <GenerateInvoiceButton
                        clientId={clientId}
                        reportId={selectedReport.id}
                        report={selectedReport}
                        variant="outline-info"
                        size="sm"
                        className="modal-action-btn"
                      />
                      {selectedReport.lineItems.some(item => item.dea_schedule === 'CI' || item.dea_schedule === 'CII') && (
                        <GenerateForm222Button
                          clientId={clientId}
                          reportId={selectedReport.id}
                          report={{ ...selectedReport, client: clientInfo }}
                          variant="outline-danger"
                          size="sm"
                          className="modal-action-btn"
                        />
                      )}
                    </>
                  )}
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      setShowReportModal(false);
                      handleDeleteReport(selectedReport);
                    }}
                    className="modal-action-btn"
                  >
                    Delete Report
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowReportModal(false)}
              className="modal-close-btn"
            >
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={cancelDeleteReport}>
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
