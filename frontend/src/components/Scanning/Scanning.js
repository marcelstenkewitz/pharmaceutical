import React, { useState, useContext, useEffect } from "react";
import { Button, Alert, Modal } from "react-bootstrap";
import { ArrowUpSquareFill, BarChartFill } from "react-bootstrap-icons";
import { Stack } from "react-bootstrap";
import { ClientContext } from "../../context/ClientContext";
import { useNavigate } from "react-router-dom";
import Wrapper from "../Layout/Wrapper";
import ClientSelector from "../Admin/ClientSelector";
import FormModal from "../Common/DataTable/FormModal";
import { getClientFormFields } from "../../utils/clientFormFields";
import apiService from "../../services/ApiService";
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
  const [localSelectedClient, setLocalSelectedClient] = useState(selectedClient?.id || "");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const [editingClient, setEditingClient] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [wholesalers, setWholesalers] = useState([]);
  const [wholesalersLoading, setWholesalersLoading] = useState(true);

  // Load wholesalers on component mount
  useEffect(() => {
    const fetchWholesalers = async () => {
      setWholesalersLoading(true);
      try {
        const response = await apiService.getWholesalers();
        console.log('Wholesalers API response:', response);
        console.log('Wholesalers array:', response.wholesalers);
        console.log('Wholesalers count:', response.wholesalers?.length || 0);
        setWholesalers(response.wholesalers || []);
      } catch (error) {
        console.error('Failed to load wholesalers:', error);
        setWholesalers([]);
      } finally {
        setWholesalersLoading(false);
      }
    };
    fetchWholesalers();
  }, []);

  // Load clients on component mount
  useEffect(() => {
    // Load clients without clearing the persisted selection
    loadClients().catch(console.error);
  }, [loadClients]);

  // Sync localSelectedClient with context's selectedClient
  useEffect(() => {
    if (selectedClient?.id) {
      setLocalSelectedClient(selectedClient.id);
    }
  }, [selectedClient]);

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

  const handleAddClient = async (data) => {
    try {
      clearError();
      const newClient = await createClient(data);
      await handleClientSelection(newClient.id);
      setShowAddClientModal(false);
      setClientRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Failed to add client:", error.message || error);
    }
  };

  const handleEditClient = () => {
    if (!localSelectedClient && !selectedClient) {
      alert("Please select a client to edit.");
      return;
    }

    const clientId = localSelectedClient || (selectedClient && selectedClient.id);
    const clientToEdit = clients.find(client => client.id === clientId);

    if (clientToEdit) {
      setEditingClient(clientToEdit);
      setShowEditClientModal(true);
      clearError();
    } else {
      alert("Unable to find client data for editing.");
    }
  };

  const handleUpdateClient = async (data) => {
    if (!editingClient) return;

    try {
      clearError();
      await updateClient(editingClient.id, data);
      setShowEditClientModal(false);
      setEditingClient(null);
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
            disabled={wholesalersLoading}
          >
            {wholesalersLoading ? 'Loading...' : 'Add Client'}
          </Button>
          {(localSelectedClient || selectedClient) && (
            <Button
              variant="warning"
              onClick={handleEditClient}
              className="scanning-action-btn"
              disabled={wholesalersLoading}
            >
              {wholesalersLoading ? 'Loading...' : 'Edit Client'}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => navigate("/admin")}
            className="scanning-action-btn"
          >
            Admin Panel
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
      <FormModal
        show={showAddClientModal}
        onHide={() => setShowAddClientModal(false)}
        onSave={handleAddClient}
        title="Add New Client"
        formFields={getClientFormFields(wholesalers)}
        error={error}
        submitButtonText="Add Client"
      />

      {/* Edit Client Modal */}
      <FormModal
        show={showEditClientModal}
        onHide={() => {
          setShowEditClientModal(false);
          setEditingClient(null);
          clearError();
        }}
        onSave={handleUpdateClient}
        title="Edit Client"
        formFields={getClientFormFields(wholesalers)}
        initialData={editingClient}
        error={error}
        submitButtonText="Update Client"
      />

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
