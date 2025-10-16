import React, { useContext, useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ClientContext } from '../../context/ClientContext';
import ClientDisplay from '../Common/ClientDisplay';
import DataTable from '../Common/DataTable/DataTable';
import apiService from '../../services/ApiService';
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

  const [wholesalers, setWholesalers] = useState([]);
  const [wholesalersLoaded, setWholesalersLoaded] = useState(false);

  // Load wholesalers on component mount
  useEffect(() => {
    const fetchWholesalers = async () => {
      try {
        const response = await apiService.getWholesalers();
        console.log('[ClientManagement] Wholesalers API response:', response);
        console.log('[ClientManagement] Wholesalers array:', response.wholesalers);
        console.log('[ClientManagement] Wholesalers count:', response.wholesalers?.length || 0);
        setWholesalers(response.wholesalers || []);
      } catch (error) {
        console.error('Failed to load wholesalers:', error);
        setWholesalers([]);
      } finally {
        setWholesalersLoaded(true);
      }
    };
    fetchWholesalers();
  }, []);

  // DataTable configuration - useMemo to recalculate when wholesalers changes
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
        key: 'accountNumber',
        label: 'Account Number',
        render: (client) => client.accountNumber || '-'
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
    formFields: getClientFormFields(wholesalers),
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
    searchFields: ['businessName', 'stateLicenseNumber'],
    emptyMessage: "No clients available.",
    addButtonText: "Add New Client",
    itemIdField: "id",
    onRowClick: (client) => navigate(`/reports/client/${client.id}`)
  }), [wholesalers, loadClients, createClient, updateClient, deleteClient, navigate]);

  // Don't render DataTable until wholesalers are loaded to prevent form initialization issues
  if (!wholesalersLoaded) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div>
          <h5>Loading Client Management...</h5>
          <p className="text-muted">Preparing form data...</p>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      {...tableConfig}
    />
  );
};

export default ClientManagement;