import React from 'react';
import { Badge } from 'react-bootstrap';
import ManualEntryModal from '../Scanning/ManualEntryModal';
import apiService from '../../services/ApiService';
import ManualEntryService from '../../services/ManualEntryService';
import DataTable from '../Common/DataTable/DataTable';

const ManualEntries = () => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  // Custom modal component that wraps ManualEntryModal
  const CustomManualEntryModal = ({ show, onHide, onSave, title, initialData, error }) => {
    const handleSubmit = async (formData) => {
      try {
        // Use shared service for consistent manual entry handling
        const result = await ManualEntryService.saveManualEntry(formData);

        if (result.isDuplicate) {
          console.log(`[ManualEntries] Updated existing entry: ${result.barcode}`);
        }

        onSave(formData); // This will trigger the DataTable to reload
      } catch (error) {
        console.error('Failed to save manual entry:', error);
        throw error; // Let DataTable handle the error
      }
    };

    return (
      <ManualEntryModal
        show={show}
        onHide={onHide}
        onSubmit={handleSubmit}
        title={title}
        submitButtonText={initialData ? "Save Changes" : "Add Entry"}
        initialData={initialData}
        saveToCache={false}
      />
    );
  };

  // DataTable configuration
  const tableConfig = {
    title: "Manual Entries Management",
    entityName: "manual entry",
    columns: [
      {
        key: 'barcode',
        label: 'Barcode/Key',
        render: ([barcode, entry]) => (
          <>
            <code>{barcode}</code>
            {entry.isManualEntry && (
              <Badge bg="secondary" className="ms-2">Manual</Badge>
            )}
          </>
        )
      },
      {
        key: 'itemName',
        label: 'Item Name',
        render: ([barcode, entry]) => entry.itemName || 'N/A'
      },
      {
        key: 'ndcNumber',
        label: 'NDC Number',
        render: ([barcode, entry]) => <code>{entry.ndcNumber || 'N/A'}</code>
      },
      {
        key: 'packageSize',
        label: 'Package Size',
        render: ([barcode, entry]) => entry.packageSize || 'N/A'
      },
      {
        key: 'labeler_name',
        label: 'Labeler Name',
        render: ([barcode, entry]) => entry.labeler_name || 'N/A'
      },
      {
        key: 'return_instructions',
        label: 'Return Instructions',
        render: ([barcode, entry]) => (
          <div style={{ maxWidth: '200px', fontSize: '0.85em' }}>
            {entry.return_instructions || 'Contact manufacturer for return instructions'}
          </div>
        )
      },
      {
        key: 'pricePerEA',
        label: 'Price per EA',
        render: ([barcode, entry]) =>
          entry.pricePerEA ? `$${parseFloat(entry.pricePerEA).toFixed(2)}` : 'N/A'
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: ([barcode, entry]) => formatDate(entry.createdAt)
      },
      {
        key: 'lastUsed',
        label: 'Last Used',
        render: ([barcode, entry]) => formatDate(entry.lastUsed)
      }
    ],
    api: {
      load: async () => {
        // Load both entries and labelers
        const [entriesResponse, labelersResponse] = await Promise.all([
          apiService.getAllManualEntries(),
          apiService.getLabelers()
        ]);

        // Convert entries object to array of [barcode, entry] pairs
        const entries = entriesResponse?.entries || {};
        const entryArray = Object.entries(entries);

        // Add return instructions to each entry
        const labelers = labelersResponse?.labelers || [];
        const enhancedEntries = entryArray.map(([barcode, entry]) => {
          const labeler = labelers.find(l => l.labeler_name === entry.labeler_name);
          return [barcode, {
            ...entry,
            return_instructions: labeler?.return_instructions
          }];
        });

        return enhancedEntries;
      },
      create: async (data) => {
        // This will be handled by the custom modal
        return data;
      },
      update: async (id, data) => {
        // This will be handled by the custom modal
        return data;
      },
      delete: (barcode) => apiService.deleteManualEntry(barcode)
    },
    features: {
      search: false,
      add: true,
      edit: true,
      delete: true,
      deleteConfirmation: 'alert'
    },
    customModals: {
      add: CustomManualEntryModal,
      edit: CustomManualEntryModal
    },
    emptyMessage: "No manual entries found. Click 'Add Manual Entry' to create your first entry.",
    addButtonText: "Add Manual Entry",
    itemIdField: "0" // Use the barcode (first element of array)
  };

  return (
    <DataTable
      {...tableConfig}
    />
  );
};

export default ManualEntries;
