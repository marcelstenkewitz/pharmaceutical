import React, { useContext } from 'react';
import { Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ClientContext } from '../../context/ClientContext';
import ClientDisplay from '../Common/ClientDisplay';
import DataTable from '../Common/DataTable/DataTable';
import { getClientFormFields } from '../../utils/clientFormFields';
import './client-management.css';


const ClientManagement = () => {
  const navigate = useNavigate();
  const {
    loadClients,
    createClient,
    updateClient,
    deleteClient
  } = useContext(ClientContext);

  // DataTable configuration - useMemo to recalculate when manufacturers changes
  const tableConfig = React.useMemo(() => ({
    title: "Client Management",
    entityName: "client",
    columns: [
      {
        key: 'businessName',
        label: 'Business Name',
        render: (client) => <ClientDisplay client={client} showContact={true} />
      },
      {
        key: 'stateLicenseNumber',
        label: 'State License',
        render: (client) => client.stateLicenseNumber || '-'
      },
      {
        key: 'wholesaler',
        label: 'Wholesaler',
        render: (client) => client.wholesaler || '-'
      },
      {
        key: 'wholesalerAccountNumber',
        label: 'Wholesaler Account',
        render: (client) => client.wholesalerAccountNumber || '-'
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
        key: 'invoicePercentage',
        label: 'Invoice %',
        render: (client) => client.invoicePercentage ? `${client.invoicePercentage}%` : '-'
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
    formFields: getClientFormFields(),
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
    searchFields: ['businessName', 'deaNumber', 'stateLicenseNumber'],
    emptyMessage: "No clients available.",
    addButtonText: "Add New Client",
    itemIdField: "id",
    onRowClick: (client) => navigate(`/reports/client/${client.id}`)
  }), [loadClients, createClient, updateClient, deleteClient, navigate]);

  return (
    <DataTable
      {...tableConfig}
    />
  );
};

export default ClientManagement;