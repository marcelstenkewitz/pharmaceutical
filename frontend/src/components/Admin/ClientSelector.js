import React, { useState, useEffect, useContext } from "react";
import { Form } from "react-bootstrap";
import { ClientContext } from "../../context/ClientContext";

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
    <Form.Group className="mb-3" controlId="clientSelect">
      <Form.Label>Select Client</Form.Label>
      <Form.Select
        value={selectedClient || ""}
        onChange={e => setSelectedClient(e.target.value)}
        disabled={loading || localLoading}
      >
        <option value="" disabled>
          {loading ? "Loading clients..." : "Select a client..."}
        </option>
        {clients.map(client => (
          <option key={client.id} value={client.id}>{client.name}</option>
        ))}
      </Form.Select>
    </Form.Group>
  );
};

export default ClientSelector;
