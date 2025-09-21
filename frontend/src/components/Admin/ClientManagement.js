import React, { useContext } from 'react';
import { Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ClientContext } from '../../context/ClientContext';
import { validateDEANumber } from '../../utils/deaValidator';
import ClientDisplay from '../Common/ClientDisplay';
import DataTable from '../Common/DataTable/DataTable';

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
        label: 'DEA Number'
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
        key: 'labelerName',
        label: 'Labeler',
        render: (client) => (
          <div>
            <strong>{client.labelerName || 'N/A'}</strong>
            {client.returnInstructions && (
              <div className="text-muted small" style={{ maxWidth: '200px' }}>
                {client.returnInstructions.substring(0, 50)}
                {client.returnInstructions.length > 50 ? '...' : ''}
              </div>
            )}
          </div>
        )
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
      },
      {
        name: 'labelerName',
        label: 'Labeler Name',
        type: 'text',
        required: false,
        placeholder: 'e.g., Pfizer Inc, Johnson & Johnson',
        helpText: 'Name of the company that manufactured/labeled the product'
      },
      {
        name: 'returnInstructions',
        label: 'Return Instructions',
        type: 'textarea',
        rows: 3,
        required: false,
        placeholder: 'Detailed instructions for returning products to this labeler...',
        helpText: 'Include phone numbers, addresses, special procedures, or portal information'
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
    searchFields: ['businessName', 'deaNumber', 'labelerName'],
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