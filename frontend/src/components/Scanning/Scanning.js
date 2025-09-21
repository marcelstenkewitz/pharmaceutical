import React, { useState, useContext, useEffect } from "react";
import { Button, Form, Alert, Modal } from "react-bootstrap";
import { ArrowUpSquareFill, BarChartFill } from "react-bootstrap-icons";
import { Stack } from "react-bootstrap";
import { ClientContext } from "../../context/ClientContext";
import { useNavigate } from "react-router-dom";
import Wrapper from "../Layout/Wrapper";
import ClientSelector from "../Admin/ClientSelector";
import { validateDEANumber } from "../../utils/deaValidator";
import "./scanning.css";

const Scanning = () => {
  const {
    clients,
    selectedClient,
    selectClient,
    setSelectedClient,
    createClient,
    updateClient,
    deleteClient,
    loadClients,
    error,
    clearError,
    resetSession
  } = useContext(ClientContext);

  const navigate = useNavigate();
  const [localSelectedClient, setLocalSelectedClient] = useState("");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const [editingClient, setEditingClient] = useState(null);
  const [newClientData, setNewClientData] = useState({
    businessName: "",
    deaNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    phoneNumber: "",
    contactName: ""
  });
  const [deaValidationError, setDeaValidationError] = useState("");
  const [editDeaValidationError, setEditDeaValidationError] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Load clients on component mount and clear any persisted selection
  useEffect(() => {
    // Clear any persisted client selection on mount
    setSelectedClient(null);
    loadClients().catch(console.error);
  }, [loadClients, setSelectedClient]);

  const handleClientSelection = async (clientId) => {
    setLocalSelectedClient(clientId);
    await selectClient(clientId);
  };

  const handleCreateNewReport = () => {
    if (!localSelectedClient && !selectedClient) {
      alert("Please select a client before creating a new report.");
      return;
    }
    clearError();
    resetSession();
    const clientId = localSelectedClient || (selectedClient && selectedClient.id);
    navigate(`/scanning/client/${clientId}`);
  };

  const handleViewReports = () => {
    if (!localSelectedClient && !selectedClient) {
      alert("Please select a client to view their reports.");
      return;
    }
    clearError();
    const clientId = localSelectedClient || (selectedClient && selectedClient.id);
    navigate(`/reports/client/${clientId}`);
  };

  const handleAddClient = async () => {
    if (!newClientData.businessName.trim() || !newClientData.deaNumber.trim() || 
        !newClientData.streetAddress.trim() || !newClientData.city.trim() || 
        !newClientData.state.trim() || !newClientData.zipCode.trim()) {
      console.error("All fields are required");
      return;
    }

    // Validate DEA number before submission
    const deaValidation = validateDEANumber(newClientData.deaNumber);
    if (!deaValidation.isValid) {
      setDeaValidationError(deaValidation.error);
      return;
    }
    try {
      clearError();
      const newClient = await createClient(newClientData);
      await handleClientSelection(newClient.id);
      setShowAddClientModal(false);
      setDeaValidationError("");
      setClientRefreshKey(prev => prev + 1);
      setNewClientData({
        businessName: "",
        deaNumber: "",
        streetAddress: "",
        city: "",
        state: "",
        zipCode: "",
        phoneNumber: "",
        contactName: ""
      });
    } catch (error) {
      console.error("Failed to add client:", error.message || error);
    }
  };

  const handleManualEntries = () => {
    navigate("/manual-entries");
  };


  const handleManageClients = () => {
    navigate("/clients");
  };

  const handleEditClient = () => {
    if (!localSelectedClient && !selectedClient) {
      alert("Please select a client to edit.");
      return;
    }
    
    const clientId = localSelectedClient || (selectedClient && selectedClient.id);
    const clientToEdit = clients.find(client => client.id === clientId);
    
    if (clientToEdit) {
      setEditingClient({
        id: clientToEdit.id,
        businessName: clientToEdit.businessName || '',
        deaNumber: clientToEdit.deaNumber || '',
        streetAddress: clientToEdit.streetAddress || '',
        city: clientToEdit.city || '',
        state: clientToEdit.state || '',
        zipCode: clientToEdit.zipCode || '',
        phoneNumber: clientToEdit.phoneNumber || '',
        contactName: clientToEdit.contactName || ''
      });
      setShowEditClientModal(true);
      clearError();
    } else {
      alert("Unable to find client data for editing.");
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    
    if (!editingClient.businessName.trim() || !editingClient.deaNumber.trim() || 
        !editingClient.streetAddress.trim() || !editingClient.city.trim() || 
        !editingClient.state.trim() || !editingClient.zipCode.trim()) {
      console.error("All fields are required");
      return;
    }

    // Validate DEA number before submission
    const deaValidation = validateDEANumber(editingClient.deaNumber);
    if (!deaValidation.isValid) {
      setEditDeaValidationError(deaValidation.error);
      return;
    }
    
    try {
      clearError();
      await updateClient(editingClient.id, {
        businessName: editingClient.businessName,
        deaNumber: editingClient.deaNumber,
        streetAddress: editingClient.streetAddress,
        city: editingClient.city,
        state: editingClient.state,
        zipCode: editingClient.zipCode,
        phoneNumber: editingClient.phoneNumber,
        contactName: editingClient.contactName
      });
      
      setShowEditClientModal(false);
      setEditingClient(null);
      setEditDeaValidationError("");
      setClientRefreshKey(prev => prev + 1);
      
    } catch (error) {
      console.error("Failed to update client:", error.message || error);
    }
  };

  const handleDeleteClient = async () => {
    if (!editingClient) return;

    try {
      clearError();
      await deleteClient(editingClient.id);

      // Close modals and reset state
      setShowEditClientModal(false);
      setShowDeleteConfirmation(false);
      setEditingClient(null);
      setEditDeaValidationError("");

      // Reset local selected client if it was the deleted one
      if (localSelectedClient === editingClient.id) {
        setLocalSelectedClient("");
      }

      // Reset global selected client if it was the deleted one
      if (selectedClient && selectedClient.id === editingClient.id) {
        setSelectedClient(null);
      }

      setClientRefreshKey(prev => prev + 1);

    } catch (error) {
      console.error("Failed to delete client:", error.message || error);
      setShowDeleteConfirmation(false);
    }
  };

  return (
    <Wrapper centerText={true}>
      <div className="scanning-container">
        {error &&
          <Alert variant="danger" className="text-center mb-3">
            <Alert.Heading>Oh snap! You got an error!</Alert.Heading>
            <p>{error}</p>
          </Alert>
        }
        <Stack gap={3} className="mt-5">
        <ClientSelector
          key={clientRefreshKey}
          selectedClient={localSelectedClient}
          setSelectedClient={handleClientSelection}
        />
        <div className="d-flex flex-wrap gap-3 mb-3 justify-content-center action-buttons-group">
          <Button
            variant="success"
            onClick={() => setShowAddClientModal(true)}
            className="scanning-action-btn"
          >
            Add Client
          </Button>
          {(localSelectedClient || selectedClient) && (
            <Button
              variant="warning"
              onClick={handleEditClient}
              className="scanning-action-btn"
            >
              Edit Client
            </Button>
          )}
          <Button
            variant="info"
            onClick={handleManualEntries}
            className="scanning-action-btn"
          >
            Manage Manual Entries
          </Button>
          <Button
            variant="secondary"
            onClick={handleManageClients}
            className="scanning-action-btn"
          >
            Manage Clients
          </Button>
        </div>
        <div className="icon-action-container">
          <h2>Create a New Report</h2>
          <ArrowUpSquareFill
            onClick={handleCreateNewReport}
            className={`check-btn p-2 mobile-icon action-icon ${(!localSelectedClient && !selectedClient) ? 'action-icon-disabled' : 'action-icon-enabled'}`}
            size={200}
          />
          {(!localSelectedClient && !selectedClient) && (
            <p className="text-muted mt-2">Please select a client first</p>
          )}
        </div>
        <div className="icon-action-container">
          <h2>View Reports</h2>
          <BarChartFill
            onClick={handleViewReports}
            className={`check-btn p-2 mobile-icon action-icon ${(!localSelectedClient && !selectedClient) ? 'action-icon-disabled' : 'action-icon-enabled'}`}
            size={200}
          />
          {(!localSelectedClient && !selectedClient) && (
            <p className="text-muted mt-2">Please select a client first</p>
          )}
        </div>
      </Stack>

      {/* Add Client Modal */}
      <Modal show={showAddClientModal} onHide={() => {
        setShowAddClientModal(false);
        setDeaValidationError("");
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Business Name *</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.businessName}
                onChange={(e) => setNewClientData({...newClientData, businessName: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>DEA Number *</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.deaNumber}
                onChange={(e) => {
                  const deaValue = e.target.value;
                  setNewClientData({...newClientData, deaNumber: deaValue});
                  if (deaValue) {
                    const validation = validateDEANumber(deaValue);
                    setDeaValidationError(validation.isValid ? "" : validation.error);
                  } else {
                    setDeaValidationError("");
                  }
                }}
                isInvalid={!!deaValidationError}
                required
              />
              {deaValidationError && (
                <Form.Control.Feedback type="invalid">
                  {deaValidationError}
                </Form.Control.Feedback>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Street Address *</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.streetAddress}
                onChange={(e) => setNewClientData({...newClientData, streetAddress: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>City *</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.city}
                onChange={(e) => setNewClientData({...newClientData, city: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>State *</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.state}
                onChange={(e) => setNewClientData({...newClientData, state: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Zip Code *</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.zipCode}
                onChange={(e) => setNewClientData({...newClientData, zipCode: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.phoneNumber}
                onChange={(e) => setNewClientData({...newClientData, phoneNumber: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Name</Form.Label>
              <Form.Control
                type="text"
                value={newClientData.contactName}
                onChange={(e) => setNewClientData({...newClientData, contactName: e.target.value})}
                placeholder="John Doe"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="modal-footer-mobile">
          <Button variant="secondary" onClick={() => {
            setShowAddClientModal(false);
            setDeaValidationError("");
          }} className="modal-footer-btn">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddClient} className="modal-footer-btn">
            Add Client
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Client Modal */}
      <Modal show={showEditClientModal} onHide={() => {
        setShowEditClientModal(false);
        setEditingClient(null);
        setEditDeaValidationError("");
        clearError();
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Business Name *</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.businessName || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, businessName: e.target.value}))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>DEA Number *</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.deaNumber || ''}
                onChange={(e) => {
                  const deaValue = e.target.value;
                  setEditingClient(prev => ({...prev, deaNumber: deaValue}));
                  if (deaValue) {
                    const validation = validateDEANumber(deaValue);
                    setEditDeaValidationError(validation.isValid ? "" : validation.error);
                  } else {
                    setEditDeaValidationError("");
                  }
                }}
                isInvalid={!!editDeaValidationError}
                required
              />
              {editDeaValidationError && (
                <Form.Control.Feedback type="invalid">
                  {editDeaValidationError}
                </Form.Control.Feedback>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Street Address *</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.streetAddress || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, streetAddress: e.target.value}))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>City *</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.city || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, city: e.target.value}))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>State *</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.state || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, state: e.target.value}))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Zip Code *</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.zipCode || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, zipCode: e.target.value}))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.phoneNumber || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, phoneNumber: e.target.value}))}
                placeholder="(555) 123-4567"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Name</Form.Label>
              <Form.Control
                type="text"
                value={editingClient?.contactName || ''}
                onChange={(e) => setEditingClient(prev => ({...prev, contactName: e.target.value}))}
                placeholder="John Doe"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="modal-footer-mobile">
          <Button variant="danger" onClick={() => setShowDeleteConfirmation(true)} className="modal-footer-btn">
            Delete Client
          </Button>
          <div className="ms-auto modal-footer-right">
            <Button variant="secondary" className="me-2 modal-footer-btn" onClick={() => {
              setShowEditClientModal(false);
              setEditingClient(null);
              setEditDeaValidationError("");
              clearError();
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateClient} className="modal-footer-btn">
              Update Client
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirmation} onHide={() => setShowDeleteConfirmation(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the client <strong>{editingClient?.businessName}</strong>?</p>
          <p className="text-muted">This action cannot be undone. All associated reports will also be deleted.</p>
        </Modal.Body>
        <Modal.Footer className="modal-footer-mobile">
          <Button variant="secondary" onClick={() => setShowDeleteConfirmation(false)} className="modal-footer-btn">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteClient} className="modal-footer-btn">
            Delete Client
          </Button>
        </Modal.Footer>
      </Modal>
      </div>
    </Wrapper>
  );
};

export default Scanning;
