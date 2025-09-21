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
    createClient, 
    updateClient, 
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

  // Load clients on component mount
  useEffect(() => {
    loadClients().catch(console.error);
  }, [loadClients]);

  const handleClientSelection = async (clientId) => {
    setLocalSelectedClient(clientId);
    await selectClient(clientId);
  };

  const handleCreateNewReport = () => {
    if (!localSelectedClient && !selectedClient) {
      console.error("Please select a client before creating a new report.");
      return;
    }
    clearError();
    resetSession();
    const clientId = localSelectedClient || (selectedClient && selectedClient.id);
    navigate(`/scanning/client/${clientId}`);
  };

  const handleViewReports = () => {
    if (!localSelectedClient && !selectedClient) {
      console.error("Please select a client to view their reports.");
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
        zipCode: ""
      });
    } catch (error) {
      console.error("Failed to add client:", error.message || error);
    }
  };

  const handleManualEntries = () => {
    navigate("/manual-entries");
  };

  const handleLabelers = () => {
    navigate("/labelers");
  };

  const handleEditClient = () => {
    if (!localSelectedClient && !selectedClient) {
      console.error("Please select a client to edit.");
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
        zipCode: clientToEdit.zipCode || ''
      });
      setShowEditClientModal(true);
      clearError();
    } else {
      console.error("Unable to find client data for editing.");
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
        zipCode: editingClient.zipCode
      });
      
      setShowEditClientModal(false);
      setEditingClient(null);
      setEditDeaValidationError("");
      setClientRefreshKey(prev => prev + 1);
      
    } catch (error) {
      console.error("Failed to update client:", error.message || error);
    }
  };

  return (
    <Wrapper centerText={true}>
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
        <div>
          <Button 
            variant={localSelectedClient || selectedClient ? "warning" : "success"} 
            onClick={localSelectedClient || selectedClient ? handleEditClient : () => setShowAddClientModal(true)}
          >
            {localSelectedClient || selectedClient ? "Edit Client" : "Add Client"}
          </Button>
          <Button 
            variant="info" 
            className="ms-2"
            onClick={handleManualEntries}
          >
            Manage Manual Entries
          </Button>
          <Button 
            variant="secondary" 
            className="ms-2"
            onClick={handleLabelers}
          >
            Manage Labelers
          </Button>
        </div>
        <div>
          <h2>Create a New Report</h2>
          <ArrowUpSquareFill
            onClick={handleCreateNewReport}
            className="check-btn p-2"
            size={200}
            disabled={!localSelectedClient && !selectedClient}
          />
        </div>
        <div>
          <h2>View Reports</h2>
          <BarChartFill
            onClick={handleViewReports}
            className="check-btn p-2"
            size={200}
            disabled={!localSelectedClient && !selectedClient}
          />
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
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAddClientModal(false);
            setDeaValidationError("");
          }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddClient}>
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
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowEditClientModal(false);
            setEditingClient(null);
            setEditDeaValidationError("");
            clearError();
          }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateClient}>
            Update Client
          </Button>
        </Modal.Footer>
      </Modal>
    </Wrapper>
  );
};

export default Scanning;
