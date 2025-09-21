import React from 'react';
import apiService from '../../services/ApiService';
import DataTable from '../Common/DataTable/DataTable';

const LabelersManagement = () => {
  // DataTable configuration
  const tableConfig = {
    title: "Labelers & Return Instructions Management",
    entityName: "labeler",
    columns: [
      {
        key: 'labeler_name',
        label: 'Labeler Name',
        render: (labeler) => <strong>{labeler.labeler_name}</strong>
      },
      {
        key: 'return_instructions',
        label: 'Return Instructions',
        render: (labeler) => (
          <div className="text-wrap" style={{ maxWidth: '400px' }}>
            {labeler.return_instructions}
          </div>
        )
      }
    ],
    formFields: [
      {
        name: 'labeler_name',
        label: 'Labeler Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Pfizer Inc, Johnson & Johnson',
        disableOnEdit: true,
        helpText: 'Labeler name cannot be changed for existing entries'
      },
      {
        name: 'return_instructions',
        label: 'Return Instructions',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'Detailed instructions for returning products to this labeler...',
        helpText: 'Include phone numbers, addresses, special procedures, or portal information'
      }
    ],
    api: {
      load: () => apiService.getLabelers(),
      create: async (data) => {
        return apiService.saveLabeler(data.labeler_name, data.return_instructions);
      },
      update: async (id, data) => {
        return apiService.saveLabeler(data.labeler_name, data.return_instructions);
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
    searchFields: ['labeler_name', 'return_instructions'],
    emptyMessage: "No labelers found. Click 'Add Labeler' to create your first entry.",
    addButtonText: "Add Labeler",
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
