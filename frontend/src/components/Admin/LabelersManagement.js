import React from 'react';
import apiService from '../../services/ApiService';
import DataTable from '../Common/DataTable/DataTable';
import './labelers-management.css';

const LabelersManagement = () => {
  // DataTable configuration
  const tableConfig = {
    title: "Wholesalers & Return Instructions Management",
    entityName: "wholesaler",
    columns: [
      {
        key: 'labeler_name',
        label: 'Wholesaler Name',
        render: (labeler) => <strong>{labeler.labeler_name}</strong>
      },
      {
        key: 'address',
        label: 'Address',
        render: (labeler) => (
          <div className="wholesaler-address">
            {labeler.address && (
              <>
                {labeler.address}<br />
                {labeler.city && labeler.state && `${labeler.city}, ${labeler.state}`}
                {labeler.zipCode && ` ${labeler.zipCode}`}
              </>
            )}
            {!labeler.address && '-'}
          </div>
        )
      },
      {
        key: 'return_instructions',
        label: 'Return Instructions',
        render: (labeler) => (
          <div className="labeler-return-instructions">
            {labeler.return_instructions}
          </div>
        )
      }
    ],
    formFields: [
      {
        name: 'labeler_name',
        label: 'Wholesaler Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., McKesson, Cardinal Health, AmerisourceBergen',
        disableOnEdit: true,
        helpText: 'Wholesaler name cannot be changed for existing entries'
      },
      {
        name: 'address',
        label: 'Street Address',
        type: 'text',
        required: false,
        placeholder: '123 Pharmacy Blvd'
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        required: false,
        placeholder: 'Springfield'
      },
      {
        name: 'state',
        label: 'State',
        type: 'text',
        required: false,
        placeholder: 'CA'
      },
      {
        name: 'zipCode',
        label: 'ZIP Code',
        type: 'text',
        required: false,
        placeholder: '90210'
      },
      {
        name: 'return_instructions',
        label: 'Return Instructions',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Detailed instructions for returning products to this wholesaler...',
        helpText: 'Include phone numbers, addresses, special procedures, or portal information'
      }
    ],
    api: {
      load: () => apiService.getLabelers(),
      create: async (data) => {
        return apiService.saveLabeler(data.labeler_name, data.return_instructions, data.address, data.city, data.state, data.zipCode);
      },
      update: async (id, data) => {
        return apiService.saveLabeler(data.labeler_name, data.return_instructions, data.address, data.city, data.state, data.zipCode);
      },
      delete: (labelerName) => apiService.deleteLabeler(labelerName)
    },
    features: {
      search: true,
      add: true,
      edit: true,
      delete: true,
      deleteConfirmation: 'alert'
    },
    searchFields: ['labeler_name', 'return_instructions', 'address', 'city'],
    emptyMessage: "No wholesalers found. Click 'Add Wholesaler' to create your first entry.",
    addButtonText: "Add Wholesaler",
    dataKey: "labelers",
    itemIdField: "labeler_name"
  };

  return (
    <DataTable
      {...tableConfig}
    />
  );
};

export default LabelersManagement;
