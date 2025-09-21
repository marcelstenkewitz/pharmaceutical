import React, { useState, useEffect, useContext } from "react";
import { Form } from "react-bootstrap";
import { ClientContext } from "../../context/ClientContext";
import { getClientName } from "../../utils/clientUtils";
import "./ClientSelector.css";

const ClientSelector = ({ selectedClient, setSelectedClient }) => {
  const { clients, loadClients, loading } = useContext(ClientContext);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        await loadClients();
      } catch (error) {
        console.error("Failed to fetch clients:", error.message || error);
      } finally {
        setLocalLoading(false);
      }
    };

    if (clients.length === 0) {
      fetchClients();
    } else {
      setLocalLoading(false);
    }
  }, [loadClients, clients.length]);

  return (
    <div className="client-selector-container">
      <Form.Group className="client-selector-form-group" controlId="clientSelect">
        <Form.Label className="client-selector-label">Select Client</Form.Label>
        <Form.Select
          className="client-selector-select"
          value={selectedClient || ""}
          onChange={e => setSelectedClient(e.target.value)}
          disabled={loading || localLoading}
        >
        <option value="" disabled>
          {loading ? "Loading clients..." : "Select a client..."}
        </option>
        {clients.map(client => (
          <option key={client.id} value={client.id}>{getClientName(client)}</option>
        ))}
        </Form.Select>
      </Form.Group>
    </div>
  );
};

export default ClientSelector;
