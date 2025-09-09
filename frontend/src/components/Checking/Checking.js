import React, { useState, useContext } from "react";
import Wrapper from "../Layout/Wrapper";
import { ArrowUpSquareFill, BarChartFill } from "react-bootstrap-icons";
import { Stack, Button, Modal, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import ClientSelector from "../Admin/ClientSelector";
import { ClientContext } from "../../context/ClientContext";
import { createClient } from "../../Api/clientApi";
import './checking.css'

const Checking = ({ setChecking }) => {
  const { setSelectedClient, setCurrentReport } = useContext(ClientContext);
  const [localSelectedClient, setLocalSelectedClient] = useState("");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const [newClientData, setNewClientData] = useState({
    businessName: "",
    deaNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: ""
  });
  const navigate = useNavigate();

  const handleClientSelection = (client) => {
    setLocalSelectedClient(client);
    setSelectedClient(client);
  };

  const handleCheckOut = () => {
    if (!localSelectedClient) {
      alert("Please select a client before proceeding to scan a new report.");
      return;
    }
    setCurrentReport({ clientId: localSelectedClient, items: [] });
    setChecking("checkingOut");
  };

  const handleAddClient = async () => {
    // Check if all required fields are filled
    if (!newClientData.businessName.trim() || !newClientData.deaNumber.trim() || 
        !newClientData.streetAddress.trim() || !newClientData.city.trim() || 
        !newClientData.state.trim() || !newClientData.zipCode.trim()) {
      alert("All fields are required");
      return;
    }
    try {
      const newClient = await createClient(newClientData);
      setLocalSelectedClient(newClient.id);
      setSelectedClient(newClient.id);
      setShowAddClientModal(false);
      setClientRefreshKey(prev => prev + 1); // Force ClientSelector to refresh
      setNewClientData({
        businessName: "",
        deaNumber: "",
        streetAddress: "",
        city: "",
        state: "",
        zipCode: ""
      });
    } catch (error) {
      console.error("Failed to add client:", error);
    }
  };

  return (
    <Wrapper centerText={true}>
      <Stack gap={3} className="mt-5">
        <ClientSelector
          key={clientRefreshKey}
          selectedClient={localSelectedClient}
          setSelectedClient={handleClientSelection}
        />
        <div>
          <Button variant="success" onClick={() => setShowAddClientModal(true)}>
            Add Client
          </Button>
        </div>
        <div>
          <h2>Check Out</h2>
          <ArrowUpSquareFill
            onClick={handleCheckOut}
            className="check-btn p-2"
            size={200}
            disabled={!localSelectedClient}
          />
        </div>
        <div>
          <h2>Reports</h2>
          <Button
            variant="primary"
            className="check-btn p-2"
            size="lg"
            onClick={() => navigate("/reports")}
            disabled={!localSelectedClient}
          >
            Go to Reports <BarChartFill className="ms-2" size={32} />
          </Button>
        </div>
      </Stack>

      <Modal show={showAddClientModal} onHide={() => setShowAddClientModal(false)}>
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
                onChange={(e) => setNewClientData({...newClientData, deaNumber: e.target.value})}
                required
              />
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
          <Button variant="secondary" onClick={() => setShowAddClientModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddClient}>
            Add Client
          </Button>
        </Modal.Footer>
      </Modal>
    </Wrapper>
  );
};

export default Checking;
