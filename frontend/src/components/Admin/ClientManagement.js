import React, { useContext } from 'react';
import { Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ClientContext } from '../../context/ClientContext';
import { validateDEANumber } from '../../utils/deaValidator';
import ClientDisplay from '../Common/ClientDisplay';
import DataTable from '../Common/DataTable/DataTable';
import './client-management.css';

const ClientManagement = () => {
  const navigate = useNavigate();
  const {
    loadClients,
    createClient,
    updateClient,
    deleteClient
  } = useContext(ClientContext);

  // DataTable configuration
  const tableConfig = {
    title: "Client Management",
    entityName: "client",
    columns: [
      {
        key: 'businessName',
        label: 'Business Name',
        render: (client) => <ClientDisplay client={client} showContact={true} />
      },
      {
        key: 'deaNumber',
        label: 'DEA Number',
        render: (client) => (
          <div>
            <div><code>{client.deaNumber}</code></div>
            {client.deaExpirationDate && (
              <div className="small text-muted">
                Exp: {new Date(client.deaExpirationDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )
      },
      {
        key: 'stateLicenseNumber',
        label: 'State License',
        render: (client) => client.stateLicenseNumber || '-'
      },
      {
        key: 'address',
        label: 'Address',
        render: (client) => (
          <div>
            {client.streetAddress}<br />
            {client.city}, {client.state} {client.zipCode}
          </div>
        )
      },
      {
        key: 'phoneNumber',
        label: 'Phone'
      },
      {
        key: 'reports',
        label: 'Reports',
        render: (client) => (
          <Badge bg="info">
            {client.reports ? client.reports.length : 0} reports
          </Badge>
        )
      }
    ],
    formFields: [
      {
        name: 'businessName',
        label: 'Business Name',
        type: 'text',
        required: true
      },
      {
        name: 'deaNumber',
        label: 'DEA Number',
        type: 'text',
        required: true,
        validate: validateDEANumber
      },
      {
        name: 'deaExpirationDate',
        label: 'DEA Expiration Date',
        type: 'date',
        required: false
      },
      {
        name: 'stateLicenseNumber',
        label: 'State License Number',
        type: 'text',
        required: false
      },
      {
        name: 'streetAddress',
        label: 'Street Address',
        type: 'text',
        required: true
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        required: true
      },
      {
        name: 'state',
        label: 'State',
        type: 'text',
        required: true
      },
      {
        name: 'zipCode',
        label: 'ZIP Code',
        type: 'text',
        required: true
      },
      {
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: false
      },
      {
        name: 'contactName',
        label: 'Contact Name',
        type: 'text',
        required: false
      }
    ],
    api: {
      load: () => loadClients(),
      create: (data) => createClient(data),
      update: (id, data) => updateClient(id, data),
      delete: (id) => deleteClient(id)
    },
    features: {
      search: true,
      add: true,
      edit: true,
      delete: true,
      deleteConfirmation: 'modal'
    },
    searchFields: ['businessName', 'deaNumber'],
    emptyMessage: "No clients available.",
    addButtonText: "Add New Client",
    itemIdField: "id",
    onRowClick: (client) => navigate(`/reports/client/${client.id}`)
  };

  return (
    <DataTable
      {...tableConfig}
    />
  );
};

export default ClientManagement;